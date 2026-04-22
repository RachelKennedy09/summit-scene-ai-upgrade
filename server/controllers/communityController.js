// server/controllers/communityController.js
// Logic for handling community-related API requests
//  - Fetching community posts (with optional filters for type & town)
//  - Creating new community posts
//  - Updating / deleting posts (owner-only)
//  - Adding replies to posts
//  - Toggling likes (like/unlike)
//
// USED BY ROUTES:
//  - GET    /api/community
//  - POST   /api/community
//  - PUT    /api/community/:id
//  - DELETE /api/community/:id
//  - POST   /api/community/:postId/replies
//  - POST   /api/community/:id/likes

import CommunityPost from "../models/CommunityPost.js";

// -------------------------------------------
// GET /api/community?type=highwayconditions&town=Banff
//   Fetch all community posts, optionally filtered by type and/or town.
//   - Posts are sorted newest-first (createdAt desc).
//   - Populates user + replies.user with profile info + avatars.
// -------------------------------------------
export async function getCommunityPosts(req, res) {
  try {
    const { type, town } = req.query;

    const filter = {};

    // Optional filters
    if (type) filter.type = type;
    if (town) filter.town = town;

    const posts = await CommunityPost.find(filter)
      .populate(
        "user",
        "name email role avatarKey town bio lookingFor instagram website"
      )
      .populate(
        "replies.user",
        "name role avatarKey town lookingFor instagram bio website"
      )
      .sort({ createdAt: -1 });

    return res.json(posts);
  } catch (error) {
    console.error("Error in GET /api/community:", error);
    return res.status(500).json({
      message: "Failed to load community posts.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/community
//   Create a new community post.
//
// AUTH:
//   - Requires authMiddleware (uses req.user.userId + req.user.name/email).
//   - Snapshots a display name (at time of posting) into post.name.
// -------------------------------------------
export async function createCommunityPost(req, res) {
  try {
    // authMiddleware sets: req.user.userId, req.user.name, req.user.email
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: missing user ID." });
    }

    const { type, town, title, body, targetDate } = req.body || {};

    // Basic validation
    if (!type || !town || !title || !body || !targetDate) {
      return res.status(400).json({
        message:
          "Type, town, title, body, and date are required for community posts.",
      });
    }

    // Snapshot the display name from the account
    const displayName =
      req.user?.name || req.user?.email || "SummitScene member";

    const newPost = await CommunityPost.create({
      user: userId,
      type,
      town,
      title,
      body,
      name: displayName,
      targetDate,
    });

    return res.status(201).json(newPost);
  } catch (error) {
    console.error("Error in POST /api/community:", error);
    return res.status(500).json({
      message: "Failed to create community post.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// DELETE /api/community/:id
//   Delete a community post by ID.
//   - Must be logged in.
//   - Only the owner of the post can delete it.
//
// FLOW:
//   1) Get postId from route params.
//   2) Find the post.
//   3) If not found -> 404.
//   4) If current user != post.user -> 403.
//   5) If owner, delete post and return success message.
// -------------------------------------------
export async function deleteCommunityPost(req, res) {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await CommunityPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Only owner can delete
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You cannot delete this post." });
    }

    await CommunityPost.findByIdAndDelete(postId);

    return res.json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error in DELETE /api/community/:id:", error);
    return res.status(500).json({
      message: "Failed to delete community post.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// PUT /api/community/:id
//   Update a community post (currently title, body, targetDate only).
//   - Must be logged in.
//   - Only the owner of the post can edit it.
//
// FLOW:
//   1) Get postId and current userId.
//   2) Find post.
//   3) Ensure it exists + belongs to user.
//   4) Validate required fields.
//   5) Update allowed fields and save.
// -------------------------------------------
export async function updateCommunityPost(req, res) {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    // Find the post first
    const post = await CommunityPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Only the owner can edit
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You cannot edit this post." });
    }

    // Fields we allow to be edited
    const { title, body, targetDate } = req.body || {};

    // title, body, and date are required for updates
    if (!title || !body || !targetDate) {
      return res.status(400).json({
        message: "Title, body, and date are required to update a post.",
      });
    }

    // Update fields
    post.title = title;
    post.body = body;
    post.targetDate = targetDate;

    const updated = await post.save();

    return res.json(updated);
  } catch (error) {
    console.error("Error in PUT /api/community/:id:", error);
    return res.status(500).json({
      message: "Failed to update community post.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/community/:postId/replies
//   Add a reply (comment) to a community post.
//   - Must be logged in.
//
// FLOW:
//   1) Validate user and reply body.
//   2) Find parent post.
//   3) Push a reply object into post.replies.
//   4) Save post.
//   5) Re-populate user + replies.user so client receives fresh data.
// -------------------------------------------
export async function addCommunityReply(req, res) {
  try {
    const { postId } = req.params;
    const { body } = req.body || {};

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    if (!body || !body.trim()) {
      return res
        .status(400)
        .json({ message: "Reply text (body) is required." });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const replyName = req.user?.name || req.user?.email || "SummitScene member";

    post.replies.push({
      user: userId,
      name: replyName,
      body: body.trim(),
    });

    await post.save();

    // Populate replies.user with avatarKey and profile info
    await post.populate(
      "replies.user",
      "name role avatarKey town lookingFor instagram bio website"
    );

    // Also include avatarKey etc on the main post user
    const populated = await post.populate(
      "user",
      "name email role avatarKey town bio lookingFor instagram website"
    );

    return res.status(201).json({
      message: "Reply added successfully.",
      post: populated,
    });
  } catch (error) {
    console.error("Error in POST /api/community/:postId/replies:", error);
    return res.status(500).json({
      message: "Failed to add reply.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/community/:id/likes
//   Toggle a like on a community post:
//     - If user has already liked → remove like
//     - If not liked yet → add like
//   - Must be logged in.
// -------------------------------------------
export async function toggleLike(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params; // postId

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const hasLiked = post.likes.some((u) => u.toString() === userId.toString());

    if (hasLiked) {
      // remove like
      post.likes = post.likes.filter((u) => u.toString() !== userId.toString());
    } else {
      // add like
      post.likes.push(userId);
    }

    await post.save();

    return res.json({
      message: hasLiked ? "Like removed" : "Post liked",
      liked: !hasLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    console.error("Error in POST /api/community/:id/likes:", error);
    return res.status(500).json({ message: "Failed to update like." });
  }
}
