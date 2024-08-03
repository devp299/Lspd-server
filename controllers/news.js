import { TryCatch } from "../middlewares/error.js";
import { Comment } from "../models/comments.js";
import { Like } from "../models/like.js";
import { News } from "../models/news.js";
import { uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

const getAllNews = TryCatch(async (req,res,next) => {
    const news = await News.find();
    res.status(200).json({success:true,data:news});
});

const createNews = TryCatch(async (req,res,next) => {
    const {title,content,location,date} = req.body;
    const file = req.file;
    if(!file) return next(new ErrorHandler("Please upload image"));
    const result = await uploadFilesToCloudinary([file]);
    const image = {
        public_id: result[0].public_id,
        url: result[0].url,
    }
    const news = await News.create({title,content,location,date,image});
    res.status(201).json({success:true,data:news});
});

const editNews = TryCatch(async (req,res,next) => {
    const {id} = req.params;
    const { title, content, location, date } = req.body;
    const news = await News.findByIdAndUpdate(id, { title, content, location, date}, {new:true});
    res.status(200).json({success:true,data:news});
});

const deleteNews = TryCatch(async (req,res,next) => {
    const {id} = req.params;
    const news = await News.findByIdAndDelete(id);
    res.status(200).json({success:true,data:news});
});

const likeNews = TryCatch(async (req, res, next) => {
  const { announcementId } = req.body;

  if (!announcementId) {
      return res.status(400).json({ message: 'Announcement ID is required' });
  }

  try {
      // Check if the user has already liked this announcement
      const existingLike = await Like.findOne({ userId: req.user, announcementId });
      if (existingLike) {
          return res.status(400).json({ message: 'Already liked' });
      }

      // Create a new like
      const like = new Like({ userId: req.user, announcementId });
      await like.save();

      // Update the announcement with the new like
      const announcement = await News.findById(announcementId);
      if (!announcement) {
          return res.status(404).json({ message: 'Announcement not found' });
      }
      announcement.likes.push(like._id);
      await announcement.save();

      res.status(201).json({ success: true, like });
  } catch (error) {
      next(error); // Use error-handling middleware
  }
});

const unLikeNews = TryCatch(async (req,res) => {
    const { announcementId } = req.body;

  try {
    const like = await Like.findOneAndDelete({ userId: req.user._id, announcementId });
    if (!like) {
      return res.status(404).json({ message: 'Like not found' });
    }

    const announcement = await News.findById(announcementId);
    announcement.likes.pull(like._id);
    await announcement.save();

    res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const getLikes = TryCatch(async (req,res) => {
    const { announcementId } = req.params;

  try {
    const likes = await Like.find({ announcementId }).populate('userId', 'name');
    res.json({ success: true, likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

export const checkUserLike = async (req, res) => {
  try {
      const { announcementId } = req.params;
      const userId = req.user._id; // Assume req.user is the user ID

      const like = await Like.findOne({ userId, announcementId });
      if (like) {
        res.status(200).json({ liked: true });
      } else {
        res.status(200).json({ liked: false });
      }
    } catch (error) {
      console.error('Error checking like status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
};

export const giveComment = TryCatch(async (req, res, next) => {
  const { newsId, comment } = req.body;
  
  try {
    const announcement = await News.findById(newsId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const commentObject = new Comment({ newsId, userId: req.user._id, comment });
    await commentObject.save();

    announcement.comments.push(commentObject._id);
    await announcement.save();

    res.status(201).json({ success: true, data: commentObject });
  } catch (error) {
    next(error);
  }
});

export const getComments = TryCatch(async (req,res,next) => {
  try {
    const { announcementId } = req.params;
    const comments = await Comment.find({ announcementId }).populate('userId', 'username'); // Assuming Comment schema has a reference to the user who made the comment
    // console.log(comments);
    res.status(200).json({ success: true, comments });
  } catch (error) {
    next(error);
  }
});


export {getAllNews, createNews, editNews, deleteNews,likeNews,unLikeNews,getLikes};
