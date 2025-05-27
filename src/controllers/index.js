class MainController {
  getHome(req, res) {
    res.json({ message: 'Welcome to the homepage' });
  }
}

module.exports = {
  MainController
};