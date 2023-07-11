
//This will be called when no 'next' function will remain to call in any function//

const ErrorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500; // StatusCode will received from the errorHandler.js
  
    err.message = err.message || "Internal Server Error";  // Message will received from the errorHandler.js
  
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  };
  
  export default ErrorMiddleware;
  