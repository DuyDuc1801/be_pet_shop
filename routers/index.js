const express = require('express');
const router = express.Router();
 
router.use('/auth', require('./auth.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/services', require('./service.routes'));
router.use('/products', require('./product.routes'));
router.use('/cart', require('./cart.routes'));  
router.use('/orders', require('./order.routes'));
router.use('/services', require('./service.routes'));
router.use('/ai', require('./ai.routes'));  
router.use('/reviews', require('./review.routes'));  
router.use('/doctor/profile', require('./doctorProfile.routes'));
router.use('/leave-requests', require('./leaveRequest.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/payment', require('./payment.routes'));
router.use('/doctors', require('./doctor.routes'));
router.use('/appointments', require('./checkin.routes'));


router.use('/doctor/profile', require('./doctorProfile.routes'));
router.use('/doctor', require('./doctorDashboard.routes')); 

router.use('/admin/inventory', require('./inventory.routes'));
router.use('/admin/appointments',require('./adminAppointment.routes'));
router.use('/admin/stats', require('./adminStats.routes'));   
router.use('/admin/orders', require('./adminOrder.routes')); 
router.use('/admin/users', require('./adminUser.routes'));
router.use('/admin/services', require('./adminService.routes'));
router.use('/admin/doctors', require('./adminDoctor.routes'));  

router.use('/medical-records', require('./medicalRecord.route'));

module.exports = router;