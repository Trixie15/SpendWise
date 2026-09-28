const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/dashboardController');

router.use(protect);

router.get('/summary', c.getSummary);
router.get('/by-category', c.getCategoryBreakdown);
router.get('/monthly-trend', c.getMonthlyTrend);

module.exports = router;
