import {Course} from '../modals/Course.js';
import {catchAsyncError} from '../middlewares/catchAsyncError.js';
import ErrorHandler from '../utils/errorHandler.js';
import cloudinary from "cloudinary";
import getDataUri from "../utils/dataUri.js";
import { Stats } from "../modals/Stats.js";


// All Courses API //

export const getAllCourses = catchAsyncError(async(req, res, next) => {

  //This is query code, which will give result as per the query submitted by the user keyword/category.
  
  const keyword = req.query.keyword || "";
  const category = req.query.category || "";

  const courses = await Course.find({
    title: {
      $regex: keyword,
      $options: "i",
    },
    category: {
      $regex: category,
      $options: "i",
    },
  }).select("-lectures"); //This will retirate all the arrays of Course. Due to await this line will execute first. The records will not contains 'lectures' as the same is to be shown to specific users only.
  res.status(200).json({
    success: true,
    courses,
  });
});

//Create Course API //
export const createCourse = catchAsyncError(async(req, res, next) => {

    const { title, description, category, createdBy } = req.body; //all details will be capture from 'body'.

    //Error Handling //

    if (!title || !description || !category || !createdBy)
    return next(new ErrorHandler("Please add all fields", 400));

   //Below code is use for uploading of file on cloudinary using multer middleware and datauri utility

    const file = req.file; //Multer middleware will be used for requesting file.

    const fileUri = getDataUri(file); //The 'file' will be in blob format, hence a URI required for the same.
  
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);

    
    await Course.create({
        title,
        description,
        category,
        createdBy,
        poster: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
        },
      });

    res.status(201).json({ //status 201 means created successful
        success: true,
        message: "Course Created Successfully. You can add lectures now.",

    });
});


//Get Course Lectures API //
export const getCourseLectures = catchAsyncError(async (req, res, next) => {
    const course = await Course.findById(req.params.id); //Course is find by id submitted by user through query.
  
    if (!course) return next(new ErrorHandler("Course not found", 404));
  
    course.views += 1; //This will increase views by 'one' if the course submitted by user is found.
  
    await course.save();
  
    res.status(200).json({
      success: true,
      lectures: course.lectures, //if courses find than show lecture
    });
  });


 //Add Lecture API //

 // Max video size 100mb
export const addLecture = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { title, description } = req.body;
  
    const course = await Course.findById(id);
  
    if (!course) return next(new ErrorHandler("Course not found", 404));
  
    //Below code is use for uploading of video file on cloudinary using multer middleware and datauri utility
    const file = req.file;
    const fileUri = getDataUri(file);

    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content, {resource_type: "video",}); 
    

    course.lectures.push({
      title,
      description,
      video: {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
      },
    });
  
    course.numOfVideos = course.lectures.length;
  
    await course.save();
  
    res.status(200).json({
      success: true,
      message: "Lecture added in Course",
    });

});

 //Delete Course API //
export const deleteCourse = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
  
    const course = await Course.findById(id);
  
    if (!course) return next(new ErrorHandler("Course not found", 404));
  
    await cloudinary.v2.uploader.destroy(course.poster.public_id); //This will destroy poster of the selected course
  
    for (let i = 0; i < course.lectures.length; i++) {
      const singleLecture = course.lectures[i];
      await cloudinary.v2.uploader.destroy(singleLecture.video.public_id, {
        resource_type: "video",
      }); //This will delete selected lecture
    }
  
    await course.remove(); //This will remove the course after deleting all lecture from the course as above.
  
    res.status(200).json({
      success: true,
      message: "Course Deleted Successfully",
    });
  });


   //Delete Lecture API //
  export const deleteLecture = catchAsyncError(async (req, res, next) => {
    const { courseId, lectureId } = req.query;
  
    //This will find course by courseid submitted in the query and show error if it is not matched with DB
    const course = await Course.findById(courseId);
    if (!course) return next(new ErrorHandler("Course not found", 404));
  
    //This will delete the lecture from cloudinary.
    const lecture = course.lectures.find((item) => {
      if (item._id.toString() === lectureId.toString()) return item;
    });
    await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
      resource_type: "video",
    });
  
    //This will return all the lectures which are not matched with the user query.
    course.lectures = course.lectures.filter((item) => {
      if (item._id.toString() !== lectureId.toString()) return item;
    });
  
    
    course.numOfVideos = course.lectures.length;
  
    await course.save();
  
    res.status(200).json({
      success: true,
      message: "Lecture Deleted Successfully",
    });
  });
  
  //This will call everytime when any changes occurs in the users collection. Mainly occurs when stats update. 
  Course.watch().on("change", async () => {
    const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1); //This will store the last/latest value in the 'stats' object.
  
    const courses = await Course.find({});
  
    let totalViews = 0;
  
    for (let i = 0; i < courses.length; i++) {
      totalViews += courses[i].views;
    }
    stats[0].views = totalViews;
    stats[0].createdAt = new Date(Date.now());
  
    await stats[0].save();
  });
  