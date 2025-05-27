// This file exports middleware functions for processing requests.

const exampleMiddleware = (req, res, next) => {
    console.log('Request received:', req.method, req.url);
    next();
};

module.exports = {
    exampleMiddleware,
};