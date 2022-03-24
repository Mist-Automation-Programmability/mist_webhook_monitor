/*================================================================
ERROR:
Generic error rendering with console loging
================================================================*/
const app = require("../app");

module.exports.render = function(error, currentPage, req, res) {
    var status, message, stack;
    console.error("\x1b[31mERROR\x1b[0m:", error);
    if (error.status) status = error.status;
    else status = 500;
    if (error.message) message = error.message;
    else message = error;
    if (error.stack && app.get('env') === 'development') stack = error.stack;
    else stack = "";
    res.status(status).render("error", {
        current_page: currentPage,
        status: status,
        message: message,
        stack: stack
    });
};