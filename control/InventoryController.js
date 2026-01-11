import Location from "../models/Location.js";
import Item from "../models/Item.js";
import Inventory from "../models/Inventory.js";
import Employee from "../models/Employee.js"; 
import Category from "../models/Category.js";
import StockMovement from "../models/StockMovement.js";    
import StockTransfer from "../models/StockTransfer.js"; 
import cloudinary from '../utils/cloudinary.js';
import multer from "multer";
import mongoose from "mongoose";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- إدارة المواقع (Locations) ---

const addLocation = async(req, res) => {
    try {
        const { name, city, address, managerId } = req.body; 
        const existingLocation = await Location.findOne({ name });
        if (existingLocation) {
            return res.status(400).json({ success: false, message: "اسم الموقع موجود بالفعل." });
        }
        let managerRef = null;
        if (managerId) {
            const employee = await Employee.findById(managerId);
            if (!employee) {
                return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف المختار كمدير." });
            }
            managerRef = managerId;
        }
        const newLocation = new Location({
            name,
            city,
            address,
            manager: managerRef
        });

        await newLocation.save();
        return res.status(201).json({ success: true, message: 'تم إنشاء الموقع بنجاح', location: newLocation });
    } catch (err) {
        console.error("إضافة خطأ في الموقع:", err);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء إضافة الموقع.' });
    }
};

const getLocations = async(req, res) => {
    try {
        const user = req.user;
        let filter = {};
        if (user.role !== 'admin' && user.location) {
            filter = { _id: user.location };
        }

        const locations = await Location.find(filter).populate({
            path: 'manager', 
            select: 'employeeId userId',
            populate: {
                path: 'userId',
                select: 'name email profileImage'
            }
        });
        return res.status(200).json({ success: true, locations });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء استرجاع المواقع.' });
    }
};

const updateLocation = async(req, res) => {
    try {
        const { id } = req.params; 
        const { name, city, address, managerId } = req.body;
        const updateFields = { name, city, address };
        if (managerId) {
            const employee = await Employee.findById(managerId);
            if (!employee) return res.status(404).json({ success: false, message: "المدير المختار غير موجود." });
            updateFields.manager = managerId;
        }
        const updatedLocation = await Location.findByIdAndUpdate(id, updateFields, { new: true });
        return res.status(200).json({ success: true, message: 'تم تحديث بيانات الموقع بنجاح', location: updatedLocation });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تحديث الموقع.' });
    }
};

const deleteLocation = async(req, res) => {
    try {
        const { id } = req.params;
        const relatedInventory = await Inventory.findOne({ location: id, quantity: { $gt: 0 } });
        if (relatedInventory) {
            return res.status(400).json({ success: false, message: "لا يمكن حذف الموقع لوجود مخزون مسجل عليه حالياً." });
        }
        await Location.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'تم حذف الموقع بنجاح.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في حذف الموقع.' });
    }
};

// --- إدارة الأصناف (Items) ---


const addItem = async (req, res) => {
    try {
        const { sku, name, description, unitOfMeasure, costPrice, category, branchStocks } = req.body;
        const userId = req.user._id;

        // 1. التحقق من الحقول الأساسية
        if (!sku || !name || !category || !costPrice) {
            return res.status(400).json({ success: false, message: "يرجى إكمال الحقول الأساسية." });
        }

        const cleanSku = sku.toUpperCase().trim();
        const existingItem = await Item.findOne({ $or: [{ sku: cleanSku }, { name }] });
        if (existingItem) {
            return res.status(400).json({ success: false, message: "رمز المنتج (SKU) أو الاسم موجود مسبقاً." });
        }

        // 2. معالجة الصورة باستخدام الـ buffer (لأنك تستخدم memoryStorage)
        let imageUrl = null;
        let imagePublicId = null;

        if (req.file) {
            try {
                const uploadRes = await new Promise((resolve, reject) => {
                    // استخدام upload_stream حصراً للتعامل مع buffer الذاكرة
                    const stream = cloudinary.uploader.upload_stream(
                        { 
                            folder: "inventory_items",
                            upload_preset: "Employee Platform" 
                        },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    // إرسال الـ buffer الخاص بالملف إلى Cloudinary
                    stream.end(req.file.buffer);
                });
                imageUrl = uploadRes.secure_url;
                imagePublicId = uploadRes.public_id;
            } catch (uploadError) {
                console.error("Cloudinary Error:", uploadError);
                // السيرفر لن ينهار هنا، سيكمل إضافة الصنف بدون صورة
            }
        }

        // 3. حفظ المنتج
        const newItem = new Item({ 
            sku: cleanSku, 
            name, 
            description, 
            unitOfMeasure, 
            costPrice: Number(costPrice),
            category,
            imageUrl, 
            imagePublicId 
        });
        await newItem.save();

        // 4. توزيع الكميات والـ minStockLevel
        if (branchStocks) {
            // فك التشفير لأن البيانات تأتي نصية عبر FormData
            const stocks = typeof branchStocks === 'string' ? JSON.parse(branchStocks) : branchStocks;
            
            for (const locationId in stocks) {
                const stockData = stocks[locationId];
                
                // التأكد من جلب القيم سواء كانت رقم مباشر أو Object
                const qty = typeof stockData === 'object' ? parseInt(stockData.quantity || 0) : parseInt(stockData || 0);
                const minLevel = typeof stockData === 'object' ? parseInt(stockData.minStockLevel || 0) : 10;

                // هنا ملف Inventory.js (الذي أرسلته لك) سيتولى توليد unique_item_location تلقائياً
                await Inventory.create({
                    item: newItem._id,
                    location: locationId,
                    quantity: qty,
                    minStockLevel: minLevel,
                    // توليد المفتاح يدوياً هنا لتخطي الـ Hook في الموديل مؤقتاً
                    unique_item_location: `${newItem._id}-${locationId}` 
                });

                if (qty > 0) {
                    await StockMovement.create({
                        item: newItem._id,
                        location: locationId,
                        type: 'إضافة',
                        quantity: qty,
                        reference: 'كمية افتتاحية',
                        reasonType: 'تسوية جرد',
                        user: userId
                    });
                }
            }
        }

        return res.status(201).json({ 
            success: true, 
            message: 'تم إضافة المنتج بنجاح', 
            item: newItem 
        });

    } catch (err) {
        console.error("Critical Error in addItem:", err); 
        return res.status(500).json({ 
            success: false, 
            message: 'خطأ داخلي في السيرفر', 
            error: err.message 
        });
    }
};

const getItems = async(req, res) => {
    try {
        const items = await Item.find({ isActive: true }).populate('category'); 
        return res.status(200).json({ success: true, items });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في استرجاع المنتجات.' });
    }
};

const updateItem = async(req, res) => {
    try {
        const { id } = req.params;
        const { sku, name, description, unitOfMeasure, costPrice, isActive } = req.body;
        let updateFields = { sku, name, description, unitOfMeasure, costPrice, isActive };
        
        const item = await Item.findById(id);
        if (!item) return res.status(404).json({ success: false, message: 'المنتج غير موجود.' });

        if (req.file) {
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ upload_preset: "Employee Platform" }, (error, result) => {
                    if (error) reject(error);
                    resolve(result);
                }).end(req.file.buffer);
            });
            updateFields.imageUrl = uploadRes.secure_url;
            updateFields.imagePublicId = uploadRes.public_id;
            if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId);
        }
        
        const updatedItem = await Item.findByIdAndUpdate(id, updateFields, { new: true });
        return res.status(200).json({ success: true, message: 'تم تحديث المنتج بنجاح', item: updatedItem });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تحديث المنتج.' });
    }
};

const deleteItem = async(req, res) => {
    try {
        const { id } = req.params; 
        const relatedInventory = await Inventory.findOne({ item: id, quantity: { $gt: 0 } });
        if (relatedInventory) {
            return res.status(400).json({ success: false, message: "لا يمكن حذف المنتج لأن له رصيد في المخازن." });
        }
        const deletedItem = await Item.findByIdAndDelete(id);
        if (deletedItem?.imagePublicId) await cloudinary.uploader.destroy(deletedItem.imagePublicId);
        
        // حذف سجلات المخزن المرتبطة (التي كميتها صفر)
        await Inventory.deleteMany({ item: id });

        return res.status(200).json({ success: true, message: 'تم حذف المنتج بنجاح.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في حذف المنتج.' });
    }
};

// --- الفئات (Categories) ---

const addCategory = async(req, res) => {
    try {
        const { name, description } = req.body;
        const newCategory = new Category({ name, description });
        await newCategory.save();
        return res.status(201).json({ success: true, message: 'تم إنشاء الفئة بنجاح', category: newCategory });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, message: "اسم الفئة موجود بالفعل." });
        return res.status(500).json({ success: false, message: 'خطأ في إضافة الفئة.' });
    }
};

const getCategories = async(req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        return res.status(200).json({ success: true, categories });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في استرجاع الفئات.' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const itemsCount = await Item.countDocuments({ category: id });
        if (itemsCount > 0) {
            return res.status(400).json({ success: false, message: "لا يمكن حذف قسم يحتوي على منتجات." });
        }
        await Category.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "تم حذف القسم بنجاح." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "خطأ في حذف القسم." });
    }
};

// --- عمليات المخزون (In / Out / Adjust) ---

const stockIn = async (req, res) => {
    try {
        const { itemId, locationId, quantityAdded, reference, reasonType } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.location.toString() !== locationId) {
            return res.status(403).json({ success: false, message: "لا تملك صلاحية الإضافة لمخزن فرع آخر." });
        }

        const qty = parseInt(quantityAdded);
        const newMovement = new StockMovement({
            item: itemId,
            location: locationId,
            type: 'إضافة',
            quantity: qty,
            reference: reference || 'إضافة مخزون يدوية',
            user: user._id,
            reasonType: reasonType
        });
        await newMovement.save();

        const uniqueKey = `${itemId}-${locationId}`;
        const inventoryRecord = await Inventory.findOneAndUpdate(
            { unique_item_location: uniqueKey },
            { $inc: { quantity: qty }, $set: { lastUpdated: Date.now() } },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: `تم إضافة ${qty} وحدة بنجاح.`, inventory: inventoryRecord });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في إضافة المخزون.' });
    }
};

const stockOut = async (req, res) => {
    try {
        const { itemId, locationId, quantityRemoved, reference, reasonType } = req.body; 
        const user = req.user;

        if (user.role !== 'admin' && user.location.toString() !== locationId) {
            return res.status(403).json({ success: false, message: "لا تملك صلاحية الخصم من مخزن فرع آخر." });
        }

        const qty = parseInt(quantityRemoved);
        const uniqueKey = `${itemId}-${locationId}`;
        let inventoryRecord = await Inventory.findOne({ unique_item_location: uniqueKey });

        if (!inventoryRecord || inventoryRecord.quantity < qty) {
            return res.status(400).json({ success: false, message: `مخزون غير كافٍ. المتوفر: ${inventoryRecord?.quantity || 0}` });
        }
        
        const newMovement = new StockMovement({
            item: itemId,
            location: locationId,
            type: 'خصم',
            quantity: qty,
            reference: reference || 'خصم مخزون يدوي',
            user: user._id,
            reasonType: reasonType
        });
        await newMovement.save();

        inventoryRecord.quantity -= qty;
        inventoryRecord.lastUpdated = Date.now();
        await inventoryRecord.save();
        
        return res.status(200).json({ success: true, message: `تم خصم ${qty} وحدة بنجاح.`, inventory: inventoryRecord });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في خصم المخزون.' });
    }
};

const adjustPhysicalInventory = async (req, res) => {
    try {
        const { itemId, locationId, physicalQuantity, reference } = req.body;
        const userId = req.user._id;
        const actualQty = parseInt(physicalQuantity);
        const uniqueKey = `${itemId}-${locationId}`;

        let inventoryRecord = await Inventory.findOne({ unique_item_location: uniqueKey });
        const currentQty = inventoryRecord ? inventoryRecord.quantity : 0;
        const difference = actualQty - currentQty; 

        if (difference === 0) return res.status(200).json({ success: true, message: 'الكمية متطابقة.' });
        
        await StockMovement.create({
            item: itemId,
            location: locationId,
            type: difference > 0 ? 'إضافة' : 'خصم',
            quantity: Math.abs(difference),
            reference: `تسوية جرد فعلي: ${reference || 'جرد دوري'}`,
            user: userId,
            reasonType: 'تسوية جرد' 
        });
        
        await Inventory.findOneAndUpdate(
            { unique_item_location: uniqueKey },
            { item: itemId, location: locationId, quantity: actualQty, lastUpdated: Date.now() },
            { upsert: true, new: true }
        );

        return res.status(200).json({ success: true, message: 'تمت التسوية بنجاح', data: { newQuantity: actualQty, difference } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في معالجة التسوية.' });
    }
};

// --- التحويلات (Transfers) ---

const initiateStockTransfer = async (req, res) => {
    try {
        const { sourceLocationId, destinationLocationId, itemId, quantity, reference } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.location.toString() !== sourceLocationId) {
            return res.status(403).json({ success: false, message: "لا يمكنك بدء تحويل من مخزن لا تديره." });
        }

        const qty = parseInt(quantity);
        if (sourceLocationId === destinationLocationId) return res.status(400).json({ success: false, message: "لا يمكن النقل لنفس الموقع." });

        const sourceInv = await Inventory.findOne({ item: itemId, location: sourceLocationId });
        if (!sourceInv || sourceInv.quantity < qty) return res.status(400).json({ success: false, message: "المخزون غير كافٍ بالمصدر." });

        const outgoingMovement = new StockMovement({
            item: itemId, location: sourceLocationId, type: 'خصم', quantity: qty,
            reference: `تحويل صادر: ${reference || ''}`, user: user._id, reasonType: 'التحويل'
        });
        await outgoingMovement.save();

        sourceInv.quantity -= qty;
        await sourceInv.save();

        const newTransfer = new StockTransfer({
            sourceLocation: sourceLocationId, destinationLocation: destinationLocationId,
            item: itemId, quantity: qty, reference, status: 'جاري النقل', 
            outgoingMovementId: outgoingMovement._id, initiatedBy: user._id
        });
        await newTransfer.save();

        return res.status(201).json({ success: true, message: 'بدأت عملية النقل.', transfer: newTransfer });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في بدء التحويل.' });
    }
};

const confirmStockTransfer = async (req, res) => {
    try {
        const { transferId } = req.params; 
        const user = req.user;
        const transfer = await StockTransfer.findById(transferId);
        
        if (!transfer || transfer.status !== 'جاري النقل') return res.status(400).json({ success: false, message: "الطلب غير صالح." });

        if (user.role !== 'admin' && user.location.toString() !== transfer.destinationLocation.toString()) {
            return res.status(403).json({ success: false, message: "لا تملك صلاحية استلام شحنة لهذا الفرع." });
        }

        const incomingMovement = new StockMovement({
            item: transfer.item, location: transfer.destinationLocation, type: 'إضافة', quantity: transfer.quantity,
            reference: `تحويل وارد: ${transfer.reference || ''}`, user: user._id, reasonType: 'التحويل'
        });
        await incomingMovement.save();

        const uniqueKey = `${transfer.item}-${transfer.destinationLocation}`;
        const destInv = await Inventory.findOneAndUpdate(
            { unique_item_location: uniqueKey },
            { $inc: { quantity: transfer.quantity }, $set: { lastUpdated: Date.now(), item: transfer.item, location: transfer.destinationLocation } },
            { new: true, upsert: true }
        );

        transfer.status = 'مكتمل';
        transfer.incomingMovementId = incomingMovement._id;
        await transfer.save();

        return res.status(200).json({ success: true, message: 'تم الاستلام بنجاح.', inventory: destInv });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تأكيد الاستلام.' });
    }
};

// --- التقارير والتفاصيل (Reports & Details) ---

const getInventoryReport = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        if (user.role !== 'admin' && user.location) {
            query.location = user.location;
        }

        const reportData = await Inventory.find(query)
            .populate('item')
            .populate({
                path: 'location',
                populate: { path: 'manager', populate: { path: 'userId', select: 'name' } }
            });

        const report = reportData
            .filter(record => record.item)
            .map(record => ({
                itemId: record.item._id,
                itemName: record.item.name,
                itemSku: record.item.sku,
                locationName: record.location?.name || 'موقع غير معروف',
                currentQuantity: record.quantity,
                minStockLevel: record.minStockLevel || 0,
                isLowStock: record.quantity <= (record.minStockLevel || 0),
                imageUrl: record.item.imageUrl
            }));

        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تقرير المخزون' });
    }
};

const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id).populate('category');
        if (!item) return res.status(404).json({ success: false, message: "الصنف غير موجود" });
        res.status(200).json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في جلب بيانات الصنف" });
    }
};

const updateItems = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, costPrice, description, category, isActive } = req.body;
        const item = await Item.findById(id);
        if (!item) return res.status(404).json({ success: false, message: 'المنتج غير موجود.' });

        let updateFields = {
            name, description, category, isActive,
            sku: sku ? sku.toUpperCase().trim() : item.sku,
            costPrice: costPrice ? Number(costPrice) : item.costPrice,
        };

        if (req.file) {
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ upload_preset: "Employee Platform" }, (error, result) => {
                    if (error) reject(error);
                    resolve(result);
                }).end(req.file.buffer);
            });
            updateFields.imageUrl = uploadRes.secure_url;
            updateFields.imagePublicId = uploadRes.public_id;
            if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId);
        }

        const updatedItem = await Item.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
        return res.status(200).json({ success: true, message: 'تم التحديث بنجاح', item: updatedItem });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تحديث البيانات.' });
    }
};

const getItemFullDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id).populate('category');
        if (!item) return res.status(404).json({ success: false, message: "الصنف غير موجود" });

        const inventoryRecords = await Inventory.find({ item: id }).populate('location');
        const branchDetails = inventoryRecords.map(rec => ({
            locationId: rec.location?._id,
            locationName: rec.location?.name,
            quantity: rec.quantity,
            minStockLevel: rec.minStockLevel || 0
        }));

        res.status(200).json({
            success: true,
            data: {
                itemId: item._id, itemName: item.name, itemSku: item.sku,
                categoryId: item.category?._id, description: item.description,
                branchDetails: branchDetails, imageUrl: item.imageUrl
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في جلب التفاصيل" });
    }
};

const bulkUpdateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, category, description, stocks } = req.body;
        const userId = req.user._id;

        await Item.findByIdAndUpdate(id, { name, sku: sku.toUpperCase().trim(), category, description });

        if (stocks && Array.isArray(stocks)) {
            for (const stock of stocks) {
                const uniqueKey = `${id}-${stock.locationId}`;
                const oldRecord = await Inventory.findOne({ unique_item_location: uniqueKey });
                const oldQty = oldRecord ? oldRecord.quantity : 0;

                await Inventory.findOneAndUpdate(
                    { unique_item_location: uniqueKey },
                    { 
                        item: id, location: stock.locationId, 
                        quantity: stock.quantity, minStockLevel: stock.minStockLevel,
                        lastUpdated: Date.now() 
                    },
                    { upsert: true }
                );

                if (oldQty !== stock.quantity) {
                    await StockMovement.create({
                        item: id, location: stock.locationId,
                        type: stock.quantity > oldQty ? 'إضافة' : 'خصم',
                        quantity: Math.abs(stock.quantity - oldQty),
                        reference: 'تعديل شامل من الإدارة', reasonType: 'تسوية جرد', user: userId
                    });
                }
            }
        }
        res.status(200).json({ success: true, message: "تم تحديث الصنف والكميات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في التحديث الشامل" });
    }
};

const getLowStockItems = async (req, res) => {
    try {
        const user = req.user;
        let query = { $expr: { $lte: ["$quantity", "$minStockLevel"] } };

        if (user.role !== 'admin' && user.location) {
            query.location = user.location;
        }

        const lowStockRecords = await Inventory.find(query).populate('item location');
        return res.status(200).json({ success: true, count: lowStockRecords.length, lowStockItems: lowStockRecords });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في جلب الأصناف المنخفضة.' });
    }
};

const getMonthlyStockMovementReport = async (req, res) => {
    try {
        const report = await StockMovement.aggregate([
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" },
                        item: "$item",
                        location: "$location",
                        type: "$type" 
                    },
                    totalQuantity: { $sum: "$quantity" }
                }
            },
            {
                $group: {
                    _id: { month: "$_id.month", year: "$_id.year", item: "$_id.item", location: "$_id.location" },
                    totalIn: { $sum: { $cond: [{ $eq: ["$_id.type", "إضافة"] }, "$totalQuantity", 0] } },
                    totalOut: { $sum: { $cond: [{ $eq: ["$_id.type", "خصم"] }, "$totalQuantity", 0] } }
                }
            },
            { $lookup: { from: 'items', localField: '_id.item', foreignField: '_id', as: 'item' } },
            { $lookup: { from: 'locations', localField: '_id.location', foreignField: '_id', as: 'location' } },
            {
                $project: {
                    _id: 0, year: "$_id.year", month: "$_id.month",
                    itemName: { $arrayElemAt: ["$item.name", 0] },
                    locationName: { $arrayElemAt: ["$location.name", 0] },
                    stockIn: "$totalIn", stockOut: "$totalOut"
                }
            }
        ]);
        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في التقرير الشهري.' });
    }
};

const getOverallStockTotal = async (req, res) => {
    try {
        const overallReport = await Inventory.aggregate([
            { $group: { _id: "$item", totalQuantity: { $sum: "$quantity" } } },
            { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
            {
                $project: {
                    _id: 0, itemId: "$_id",
                    itemName: { $arrayElemAt: ["$item.name", 0] },
                    itemSku: { $arrayElemAt: ["$item.sku", 0] },
                    totalQuantity: 1
                }
            }
        ]);
        return res.status(200).json({ success: true, report: overallReport });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في إجمالي المخزون.' });
    }
};

const getMonthlyStockMovementReportByLocation = async (req, res) => {
    try {
        const { locationId } = req.params;
        const report = await StockMovement.aggregate([
            { $match: { location: new mongoose.Types.ObjectId(locationId) } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, item: "$item", type: "$type" },
                    total: { $sum: "$quantity" }
                }
            },
            { $lookup: { from: 'items', localField: '_id.item', foreignField: '_id', as: 'item' } },
            {
                $project: {
                    _id: 0, month: "$_id.month",
                    itemName: { $arrayElemAt: ["$item.name", 0] },
                    total: 1, type: "$_id.type"
                }
            }
        ]);
        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في تقرير الموقع.' });
    }
};

export { 
    addItem, getItems, getLocations, addLocation, updateLocation, deleteLocation, 
    updateItem, deleteItem, stockIn, stockOut, addCategory, getCategories, deleteCategory , getItemById, updateItems,
    getInventoryReport, getMonthlyStockMovementReport, getOverallStockTotal, 
    getMonthlyStockMovementReportByLocation, initiateStockTransfer, confirmStockTransfer, adjustPhysicalInventory, getLowStockItems , getItemFullDetails , bulkUpdateItem , upload 
};