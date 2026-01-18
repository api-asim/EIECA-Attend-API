import express from 'express';
import authMiddelware from '../Middelware/authMiddelware.js';
import { 
    addCategory, addItem, addLocation, confirmStockTransfer, 
    deleteItem, deleteLocation, getCategories, getInventoryReport, 
    getItems, getLocations, getMonthlyStockMovementReport, 
    getMonthlyStockMovementReportByLocation, getOverallStockTotal, 
    initiateStockTransfer, stockIn, stockOut, updateLocation,
    adjustPhysicalInventory, getLowStockItems, upload, 
    deleteCategory, getItemById, updateItems, getItemFullDetails,
    bulkUpdateItem,
    // الدوال الجديدة التي سنضيفها الآن
    getNotifications, markNotificationAsRead, getTransferAnalytics
} from '../control/InventoryController.js';

const router = express.Router();

// --- مسارات المواقع (Locations) ---
router.get('/locations', authMiddelware('inventory:read'), getLocations); 
router.post('/add-location', authMiddelware('inventory:write'), addLocation);
router.put('/location/:id', authMiddelware('inventory:write'), updateLocation); 
router.delete('/location/:id', authMiddelware('inventory:write'), deleteLocation); 

// --- مسارات الأصناف (Items) ---
router.get('/items', authMiddelware('inventory:read'), getItems);
router.get('/item/:id', authMiddelware('inventory:read'), getItemById);
router.post('/add-item', authMiddelware('inventory:write'), upload.single('itemImage'), addItem);
router.put('/item/:id', authMiddelware('inventory:write'), upload.single('itemImage'), updateItems);
router.delete('/item/:id', authMiddelware('inventory:write'), deleteItem);

// --- مسارات الأقسام (Categories) ---
router.get('/categories', authMiddelware('inventory:read'), getCategories);
router.post('/category', authMiddelware('inventory:write'), addCategory);
router.delete('/category/:id', authMiddelware('inventory:write'), deleteCategory);

// --- حركات المخزون (Stock Operations) ---
router.post('/stock-in', authMiddelware('inventory:write'), stockIn);
router.post('/stock-out', authMiddelware('inventory:write'), stockOut);
router.post('/adjust', authMiddelware('inventory:write'), adjustPhysicalInventory);

// --- عمليات التحويل بين المخازن (المطورة) ---
router.post('/transfer/initiate', authMiddelware('inventory:write'), initiateStockTransfer);
// تعديل: تمرير البيانات في الـ body بدلاً من الـ Params لسهولة التعامل مع "العجز"
router.post('/transfer/confirm', authMiddelware('inventory:write'), confirmStockTransfer); 

// --- منظومة الإشعارات (الجديدة كلياً) ---
// جلب الإشعارات الخاصة بالمستخدم (الجرس)
router.get('/notifications', authMiddelware('inventory:read'), getNotifications);
// تحديد إشعار كمقروء (منطق تعدد الآدمن)
router.put('/notifications/:notificationId/read', authMiddelware('inventory:read'), markNotificationAsRead);

// --- التقارير والتحليلات ---
router.get('/report', authMiddelware('inventory:read'), getInventoryReport);
router.get('/transfer-analytics', authMiddelware('inventory:read'), getTransferAnalytics); // ملخص التحويلات والعجز
router.get('/monthly-movement', authMiddelware('inventory:read'), getMonthlyStockMovementReport);
router.get('/overall-total', authMiddelware('inventory:read'), getOverallStockTotal);
router.get('/monthly-movement/location/:locationId', authMiddelware('inventory:read'), getMonthlyStockMovementReportByLocation);
router.get('/low-stock', authMiddelware('inventory:read'), getLowStockItems);

// --- وظائف إضافية ---
router.get('/item-details/:id', authMiddelware('inventory:read'), getItemFullDetails);
router.put('/item-bulk-update/:id', authMiddelware('inventory:read'), bulkUpdateItem);

export default router;