const express = require('express');
const router = express.Router();
 
router.use('/auth', require('./auth.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/services', require('./service.routes'));
router.use('/admin/appointments',require('./adminAppointment.routes'));
router.use('/products', require('./product.routes'));
router.use('/cart', require('./cart.routes'));  
router.use('/orders', require('./order.routes'));
router.use('/admin/orders', require('./adminOrder.routes')); 
router.use('/services', require('./service.routes'));
router.use('/doctors', require('./doctor.routes'));
router.use('/admin/users', require('./adminUser.routes'));
router.use('/ai', require('./ai.routes')); 
router.use('/admin/stats', require('./adminStats.routes'));     
router.use('/reviews', require('./review.routes'));  
router.use('/doctor', require('./doctorDashboard.routes'));

router.use('/upload', require('./upload.routes'));

module.exports = router;