
// This will help to work to catch error//

// Passed Function - it is the replica of the function which will be passed in the catchAsyncError//

//catch(next) will call new 'arrow function' when any error invoke//

export const catchAsyncError = (passedFunction) => (req, res, next) => {
    Promise.resolve(passedFunction(req, res, next)).catch(next);
  };