/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var MainDB = require("../db");
var JLog = require("../../sub/jjlog");

function getCategories(callback) {
    MainDB.community_categories.find().on(function ($categories) {
        if ($categories) {
            $categories.sort((a, b) => a.order - b.order);
        }
        callback($categories || []);
    });
}

function getPostsByCategory(categoryId, page, pageSize, callback) {
    const offset = (page - 1) * pageSize;
    MainDB.community_posts.find(['category_id', categoryId]).on(function ($posts) {
        let postsWithComments = $posts ? [...$posts] : [];

        postsWithComments.sort((a, b) => b.created_at - a.created_at);

        const totalCount = postsWithComments.length;

        postsWithComments = postsWithComments.slice(offset, offset + pageSize);

        if (postsWithComments.length === 0) {
            callback(postsWithComments, totalCount);
            return;
        }

        let completed = 0;
        postsWithComments.forEach((post, index) => {
            MainDB.community_comments.find(['post_id', post._id]).on(function ($comments) {
                post.comment_count = ($comments || []).filter(c => !c.is_deleted).length;
                completed++;
                if (completed === postsWithComments.length) {
                    callback(postsWithComments, totalCount);
                }
            });
        });
    });
}

function getPostDetail(postId, callback) {
    MainDB.community_posts.findOne(['_id', postId]).on(function ($post) {
        if ($post) {
            MainDB.community_posts.update(['_id', postId]).set({ views: ($post.views || 0) + 1 }).on(() => {
                $post.views = ($post.views || 0) + 1;
                callback($post);
            });
        } else {
            callback(null);
        }
    });
}

function createPost(categoryId, title, content, author, callback) {
    const now = Math.floor(Date.now() / 1000);
    const newPost = {
        category_id: categoryId,
        title: title,
        content: content,
        author: author,
        views: 0,
        likes: 0,
        created_at: now,
        updated_at: now,
        is_pinned: false,
        is_locked: false
    };

    MainDB.community_posts.insert(newPost).on(function ($post) {
        callback($post);
    });
}

function updatePost(postId, title, content, callback) {
    const now = Math.floor(Date.now() / 1000);
    MainDB.community_posts.update(['_id', postId]).set({
        title: title,
        content: content,
        updated_at: now
    }).on(function () {
        MainDB.community_posts.findOne(['_id', postId]).on(function ($post) {
            callback($post);
        });
    });
}

function deletePost(postId, callback) {
    MainDB.community_posts.remove(['_id', postId]).on(function () {
        callback();
    });
}

function createComment(postId, content, author, callback) {
    const now = Math.floor(Date.now() / 1000);
    const newComment = {
        post_id: postId,
        author: author,
        content: content,
        likes: 0,
        created_at: now,
        updated_at: now,
        is_deleted: false
    };

    MainDB.community_comments.insert(newComment).on(function ($comment) {
        callback($comment);
    });
}

function updateComment(commentId, content, callback) {
    const now = Math.floor(Date.now() / 1000);
    MainDB.community_comments.update(['_id', commentId]).set({
        content: content,
        updated_at: now
    }).on(function () {
        MainDB.community_comments.findOne(['_id', commentId]).on(function ($comment) {
            callback($comment);
        });
    });
}

function deleteComment(commentId, callback) {
    MainDB.community_comments.update(['_id', commentId]).set({
        is_deleted: true,
        content: '[삭제된 댓글입니다]'
    }).on(function () {
        callback();
    });
}

function togglePostLike(postId, userId, callback) {
    MainDB.community_post_likes.findOne(['post_id', postId, 'user_id', userId]).on(function ($like) {
        if ($like) {
            MainDB.community_post_likes.remove(['post_id', postId, 'user_id', userId]).on(function () {
                MainDB.community_post_likes.find(['post_id', postId]).on(function ($likes) {
                    const likeCount = ($likes || []).length;
                    MainDB.community_posts.update(['_id', postId]).set({
                        likes: likeCount
                    }).on(function () {
                        callback(false);
                    });
                });
            });
        } else {
            const now = Math.floor(Date.now() / 1000);
            MainDB.community_post_likes.insert({
                post_id: postId,
                user_id: userId,
                created_at: now
            }).on(function () {
                MainDB.community_post_likes.find(['post_id', postId]).on(function ($likes) {
                    const likeCount = ($likes || []).length;
                    MainDB.community_posts.update(['_id', postId]).set({
                        likes: likeCount
                    }).on(function () {
                        callback(true);
                    });
                });
            });
        }
    });
}

function toggleCommentLike(commentId, userId, callback) {
    MainDB.community_comment_likes.findOne(['comment_id', commentId, 'user_id', userId]).on(function ($like) {
        if ($like) {
            MainDB.community_comment_likes.remove(['comment_id', commentId, 'user_id', userId]).on(function () {
                MainDB.community_comment_likes.find(['comment_id', commentId]).on(function ($likes) {
                    const likeCount = ($likes || []).length;
                    MainDB.community_comments.update(['_id', commentId]).set({
                        likes: likeCount
                    }).on(function () {
                        callback(false);
                    });
                });
            });
        } else {
            const now = Math.floor(Date.now() / 1000);
            MainDB.community_comment_likes.insert({
                comment_id: commentId,
                user_id: userId,
                created_at: now
            }).on(function () {
                MainDB.community_comment_likes.find(['comment_id', commentId]).on(function ($likes) {
                    const likeCount = ($likes || []).length;
                    MainDB.community_comments.update(['_id', commentId]).set({
                        likes: likeCount
                    }).on(function () {
                        callback(true);
                    });
                });
            });
        }
    });
}

function togglePostPin(postId, isPinned, callback) {
    MainDB.community_posts.update(['_id', postId]).set({
        is_pinned: isPinned
    }).on(function () {
        callback();
    });
}

function togglePostLock(postId, isLocked, callback) {
    MainDB.community_posts.update(['_id', postId]).set({
        is_locked: isLocked
    }).on(function () {
        callback();
    });
}

function isAdmin(userId, callback) {
    MainDB.users.findOne(['_id', userId]).on(function ($user) {
        const adminCheck = $user && ($user.admin === true || $user.is_admin === true);
        callback(adminCheck);
    });
}

exports.run = function (Server, page) {
    Server.get("/community", function (req, res) {
        const categoryId = req.query.categoryId || 1;
        const pageNum = parseInt(req.query.page) || 1;
        const pageSize = 20;

        getCategories(function ($categories) {
            getPostsByCategory(categoryId, pageNum, pageSize, function ($posts, total) {
                const found = $categories.find(c => c._id == categoryId);
                const currentCategoryName = found ? found.name : '카테고리';
                page(req, res, "community", {
                    categories: $categories,
                    posts: $posts,
                    currentCategory: categoryId,
                    currentCategoryName: currentCategoryName,
                    currentPage: pageNum,
                    pageSize: pageSize,
                    totalPages: Math.ceil(total / pageSize)
                });
            });
        });
    });

    Server.get("/community/post/:id", function (req, res) {
        const postId = parseInt(req.params.id);

        getPostDetail(postId, function ($post) {
            if (!$post) {
                return res.status(404).render("error", { message: "게시글을 찾을 수 없습니다." });
            }

            MainDB.community_comments.find(['post_id', postId]).on(function ($comments) {
                const comments = ($comments || []).filter(c => !c.is_deleted);

                page(req, res, "community_post", {
                    post: $post,
                    comments: comments
                });
            });
        });
    });

    Server.get("/community/write", function (req, res) {
        if (!req.session.profile) {
            return res.redirect("/login");
        }

        getCategories(function ($categories) {
            page(req, res, "community_write", {
                categories: $categories
            });
        });
    });

    Server.post("/api/community/post", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const { categoryId, title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "제목과 내용은 필수입니다." });
        }

        createPost(categoryId, title, content, req.session.profile._id, function ($post) {
            res.json({ success: true, postId: $post._id });
        });
    });

    Server.post("/api/community/post/:id/update", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const postId = parseInt(req.params.id);
        const { title, content } = req.body;

        MainDB.community_posts.findOne(['_id', postId]).on(function ($post) {
            if (!$post) {
                return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
            }

            if ($post.author !== req.session.profile._id && !req.session.profile.admin) {
                return res.status(403).json({ error: "권한이 없습니다." });
            }

            updatePost(postId, title, content, function () {
                res.json({ success: true });
            });
        });
    });

    Server.post("/api/community/post/:id/delete", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const postId = parseInt(req.params.id);

        MainDB.community_posts.findOne(['_id', postId]).on(function ($post) {
            if (!$post) {
                return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
            }

            if ($post.author !== req.session.profile._id && !req.session.profile.admin) {
                return res.status(403).json({ error: "권한이 없습니다." });
            }

            deletePost(postId, function () {
                res.json({ success: true });
            });
        });
    });

    Server.post("/api/community/comment", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const { postId, content } = req.body;

        if (!content) {
            return res.status(400).json({ error: "댓글 내용은 필수입니다." });
        }

        createComment(postId, content, req.session.profile._id, function ($comment) {
            res.json({ success: true, commentId: $comment._id });
        });
    });

    Server.post("/api/community/comment/:id/update", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const commentId = parseInt(req.params.id);
        const { content } = req.body;

        MainDB.community_comments.findOne(['_id', commentId]).on(function ($comment) {
            if (!$comment) {
                return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
            }

            if ($comment.author !== req.session.profile._id && !req.session.profile.admin) {
                return res.status(403).json({ error: "권한이 없습니다." });
            }

            updateComment(commentId, content, function () {
                res.json({ success: true });
            });
        });
    });

    Server.post("/api/community/comment/:id/delete", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const commentId = parseInt(req.params.id);

        MainDB.community_comments.findOne(['_id', commentId]).on(function ($comment) {
            if (!$comment) {
                return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
            }

            if ($comment.author !== req.session.profile._id && !req.session.profile.admin) {
                return res.status(403).json({ error: "권한이 없습니다." });
            }

            deleteComment(commentId, function () {
                res.json({ success: true });
            });
        });
    });

    Server.post("/api/community/post/:id/like", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const postId = parseInt(req.params.id);

        togglePostLike(postId, req.session.profile._id, function (isLiked) {
            res.json({ success: true, liked: isLiked });
        });
    });

    Server.post("/api/community/comment/:id/like", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        const commentId = parseInt(req.params.id);

        toggleCommentLike(commentId, req.session.profile._id, function (isLiked) {
            res.json({ success: true, liked: isLiked });
        });
    });

    Server.post("/api/community/post/:id/pin", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        isAdmin(req.session.profile._id, function (admin) {
            if (!admin) {
                return res.status(403).json({ error: "관리자 권한이 필요합니다." });
            }

            const postId = parseInt(req.params.id);
            const { isPinned } = req.body;

            togglePostPin(postId, isPinned, function () {
                res.json({ success: true });
            });
        });
    });

    Server.post("/api/community/post/:id/lock", function (req, res) {
        if (!req.session.profile) {
            return res.status(401).json({ error: "인증이 필요합니다." });
        }

        isAdmin(req.session.profile._id, function (admin) {
            if (!admin) {
                return res.status(403).json({ error: "관리자 권한이 필요합니다." });
            }

            const postId = parseInt(req.params.id);
            const { isLocked } = req.body;

            togglePostLock(postId, isLocked, function () {
                res.json({ success: true });
            });
        });
    });
};
