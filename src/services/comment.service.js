const { NotFoundError } = require("../core/error.response");
const Comment = require("../models/comment.model");
const productRepo = require("../models/repositories/product.repo");

class CommentSerivce {
  static async createComment({
    productId,
    userId,
    content,
    parentCommentId = null,
  }) {
    const comment = new Comment({
      comment_productId: productId,
      comment_userId: userId,
      comment_content: content,
      comment_parentId: parentCommentId,
    });

    let rightValue;
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) throw new NotFoundError("parent not found");
      rightValue = parentComment.comment_right;

      await Comment.updateMany(
        {
          comment_productId: productId,
          comment_right: { $gte: rightValue },
        },
        {
          $inc: { comment_right: 2 },
        }
      );

      await Comment.updateMany(
        {
          comment_productId: productId,
          comment_left: { $gt: rightValue },
        },
        {
          $inc: { comment_left: 2 },
        }
      );
    } else {
      const maxRightValue = await Comment.findOne(
        {
          comment_productId: productId,
        },
        "comment_right",
        { sort: { comment_right: -1 } }
      );

      if (maxRightValue) {
        rightValue = maxRightValue.right + 1;
      } else {
        rightValue = 1;
      }
    }

    comment.comment_left = rightValue;
    comment.comment_right = rightValue + 1;

    await comment.save();
    return comment;
  }

  static async getCommentByParentId({
    productId,
    parentCommentId = null,
    limit = 50,
    offset = 0,
  }) {
    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) throw new NotFoundError("Parent comment not found");

      const comments = await Comment.find({
        comment_productId: productId,
        comment_left: { $gt: parent.comment_left },
        comment_right: { $lte: parent.comment_right },
      })
        .select({
          comment_content: 1,
          comment_left: 1,
          comment_right: 1,
        })
        .sort({
          comment_left: 1,
        });

      return comments;
    }

    const comments = await Comment.find({
      comment_productId: productId,
      comment_parentId: null,
    })
      .select({
        comment_content: 1,
        comment_left: 1,
        comment_right: 1,
      })
      .sort({
        comment_left: 1,
      });
    return comments;
  }

  static async deleteComments({ commentId, productId }) {
    //1. check product is existed
    const foundProduct = await productRepo.findProduct({
      product_id: productId,
    });
    if (!foundProduct)
      throw new NotFoundError(`Product ${productId} not found`);

    //2. xac dinh gia tri left right cua commentId
    const comment = await Comment.findById(commentId);
    if (!comment) throw new NotFoundError(`Comment ${commentId} not found`);

    const leftValue = comment.comment_left;
    const rightValue = comment.comment_right;

    //3. tinh' width
    const width = rightValue - leftValue + 1;

    //4. xoa tat ca comment con
    await Comment.deleteMany({
      comment_productId: productId,
      comment_left: { $gte: leftValue, $lte: rightValue },
    });

    //5. cap nhap lai left va right
    await Comment.updateMany(
      {
        comment_productId: productId,
        comment_right: { $gt: rightValue },
      },
      {
        $inc: { comment_right: -width },
      }
    );

    await Comment.updateMany(
      {
        comment_productId: productId,
        comment_left: { $gt: rightValue },
      },
      {
        $inc: { comment_left: -width },
      }
    );
  }
}

module.exports = CommentSerivce;
