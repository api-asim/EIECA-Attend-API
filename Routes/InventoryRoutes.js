import express from 'express';
import authMiddelware from '../Middelware/authMiddelware.js';
import { 
    addCategory, 
    addItem, 
    addLocation, 
    confirmStockTransfer, 
    deleteItem, 
    deleteLocation, 
    getCategories, 
    getInventoryReport, 
    getItems, 
    getLocations, 
    getMonthlyStockMovementReport, 
    getMonthlyStockMovementReportByLocation, 
    getOverallStockTotal, 
    initiateStockTransfer, 
    stockIn, 
    stockOut, 
    updateLocation,
    adjustPhysicalInventory, 
    getLowStockItems, 
    upload, 
    deleteCategory, 
    getItemById, 
    updateItems, // الدالة التي أصلحنا منطقها
    getItemFullDetails,
    bulkUpdateItem
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

// ملاحظة: تم دمج updateItems هنا مع دعم رفع الصور لضمان استقبال الكمية والسعر بشكل صحيح
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

// --- عمليات التحويل بين المخازن ---
router.post('/transfer/initiate', authMiddelware('inventory:write'), initiateStockTransfer);
router.post('/transfer/confirm/:transferId', authMiddelware('inventory:write'), confirmStockTransfer);

// --- التقارير والتنبيهات ---
router.get('/report', authMiddelware('inventory:read'), getInventoryReport);
router.get('/monthly-movement', authMiddelware('inventory:read'), getMonthlyStockMovementReport);
router.get('/overall-total', authMiddelware('inventory:read'), getOverallStockTotal);
router.get('/monthly-movement/location/:locationId', authMiddelware('inventory:read'), getMonthlyStockMovementReportByLocation);
router.get('/low-stock', authMiddelware('inventory:read'), getLowStockItems);

// --- وظائف إضافية ---
router.get('/item-details/:id', authMiddelware('inventory:read'), getItemFullDetails);
router.put('/item-bulk-update/:id', authMiddelware('inventory:read'), bulkUpdateItem);

export default router;