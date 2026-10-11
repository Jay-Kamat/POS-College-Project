import apiClient from './apiClient';

// Product & Category Data Access Service Layer
const INITIAL_CATEGORIES = [
  { Id: 'cat_all', Name: 'All Items' },
  { Id: 'cat_dairy', Name: 'Dairy' },
  { Id: 'cat_bakery', Name: 'Bakery' },
  { Id: 'cat_bev', Name: 'Beverages' },
  { Id: 'cat_staples', Name: 'Staples' },
  { Id: 'cat_snacks', Name: 'Snacks' },
];

const INITIAL_PRODUCTS = [
  {
    Id: 'prd_01',
    ProductNumber: '200100101001',
    Name: 'Cow Milk 500ml Pouch',
    Cost: 30.00,
    Unit: 'PACK',
    Ingredients: 'Pasteurized Cow Milk',
    Notes: 'Keep refrigerated below 4°C',
    IsExpDate: true,
    Days: 3,
    CategoryId: 'cat_dairy',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 45,
    RecordStatus: 0
  },
  {
    Id: 'prd_09',
    ProductNumber: '200100109009',
    Name: 'Fresh Farm Cow Milk (Loose)',
    Cost: 64.00,
    Unit: 'LTR',
    Ingredients: 'Fresh pure dairy milk',
    Notes: 'Dispensed per liter/measured volume',
    IsExpDate: true,
    Days: 2,
    CategoryId: 'cat_dairy',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 65.0,
    RecordStatus: 0
  },
  {
    Id: 'prd_02',
    ProductNumber: '200100102002',
    Name: 'Whole Wheat Bread 400g',
    Cost: 40.00,
    Unit: 'PACK',
    Ingredients: 'Whole wheat flour, yeast, water',
    Notes: 'Fresh daily bake',
    IsExpDate: true,
    Days: 5,
    CategoryId: 'cat_bakery',
    TaxRateId: 'tax_0',
    TaxPercent: 0,
    StockQuantity: 28,
    RecordStatus: 0
  },
  {
    Id: 'prd_03',
    ProductNumber: '200100103003',
    Name: 'Cold Coffee 200ml Bottle',
    Cost: 45.00,
    Unit: 'PCS',
    Ingredients: 'Milk, Arabica coffee beans, sugar',
    Notes: 'Ready to drink chilled',
    IsExpDate: true,
    Days: 30,
    CategoryId: 'cat_bev',
    TaxRateId: 'tax_18',
    TaxPercent: 18,
    StockQuantity: 19,
    RecordStatus: 0
  },
  {
    Id: 'prd_04',
    ProductNumber: '200100104004',
    Name: 'Royal Basmati Rice (Loose)',
    Cost: 110.00,
    Unit: 'KG',
    Ingredients: 'Aged Long Grain Basmati',
    Notes: 'Grade A premium rice sold per KG',
    IsExpDate: false,
    Days: null,
    CategoryId: 'cat_staples',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 75.5,
    RecordStatus: 0
  },
  {
    Id: 'prd_10',
    ProductNumber: '200100110010',
    Name: 'Farm Fresh Potatoes',
    Cost: 35.00,
    Unit: 'KG',
    Ingredients: 'Directly sourced agricultural produce',
    Notes: 'Weighed fresh produce',
    IsExpDate: false,
    Days: null,
    CategoryId: 'cat_staples',
    TaxRateId: 'tax_0',
    TaxPercent: 0,
    StockQuantity: 140.0,
    RecordStatus: 0
  },
  {
    Id: 'prd_11',
    ProductNumber: '200100111011',
    Name: 'Refined Sunflower Oil (Loose)',
    Cost: 145.00,
    Unit: 'LTR',
    Ingredients: 'Refined sunflower edible oil',
    Notes: 'Dispensed per liter volume',
    IsExpDate: false,
    Days: null,
    CategoryId: 'cat_staples',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 48.0,
    RecordStatus: 0
  },
  {
    Id: 'prd_05',
    ProductNumber: '200100105005',
    Name: 'Dark Chocolate Cake 500g',
    Cost: 350.00,
    Unit: 'PCS',
    Ingredients: 'Cocoa, dark chocolate, flour, sugar',
    Notes: 'Eggless celebration cake',
    IsExpDate: true,
    Days: 2,
    CategoryId: 'cat_bakery',
    TaxRateId: 'tax_18',
    TaxPercent: 18,
    StockQuantity: 12,
    RecordStatus: 0
  },
  {
    Id: 'prd_06',
    ProductNumber: '200100106006',
    Name: 'Masala Potato Chips 100g',
    Cost: 20.00,
    Unit: 'PACK',
    Ingredients: 'Potatoes, edible oil, spices',
    Notes: 'Crispy fried snack',
    IsExpDate: true,
    Days: 60,
    CategoryId: 'cat_snacks',
    TaxRateId: 'tax_12',
    TaxPercent: 12,
    StockQuantity: 50,
    RecordStatus: 0
  },
  {
    Id: 'prd_07',
    ProductNumber: '200100107007',
    Name: 'Fresh Butter 200g',
    Cost: 65.00,
    Unit: 'PACK',
    Ingredients: 'Cream, salt',
    Notes: 'Store refrigerated',
    IsExpDate: true,
    Days: 45,
    CategoryId: 'cat_dairy',
    TaxRateId: 'tax_12',
    TaxPercent: 12,
    StockQuantity: 34,
    RecordStatus: 0
  },
  {
    Id: 'prd_08',
    ProductNumber: '200100108008',
    Name: 'Green Tea Bags 25s',
    Cost: 140.00,
    Unit: 'BOX',
    Ingredients: 'Natural green tea leaves',
    Notes: 'Antioxidant rich',
    IsExpDate: true,
    Days: 180,
    CategoryId: 'cat_bev',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 22,
    RecordStatus: 0
  }
];

const getStoredProducts = () => {
  const local = localStorage.getItem('pos_products');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every product has Unit assigned
        let updated = false;
        const normalized = parsed.map(p => {
          if (!p.Unit) {
            updated = true;
            let u = 'PCS';
            const n = (p.Name || '').toLowerCase();
            if (n.includes('rice') || n.includes('flour') || n.includes('sugar') || n.includes('potato') || n.includes('onion') || n.includes('apple')) {
              u = 'KG';
            } else if (n.includes('loose milk') || n.includes('oil') || n.includes('juice')) {
              u = 'LTR';
            } else if (n.includes('bread') || n.includes('chips') || n.includes('butter') || n.includes('pouch') || n.includes('pack')) {
              u = 'PACK';
            } else if (n.includes('box') || n.includes('tea bags')) {
              u = 'BOX';
            }
            return { ...p, Unit: u };
          }
          return p;
        });
        if (updated) {
          localStorage.setItem('pos_products', JSON.stringify(normalized));
        }
        return normalized;
      }
    } catch (e) {}
  }
  localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
};

const saveStoredProducts = (products) => {
  localStorage.setItem('pos_products', JSON.stringify(products));
};

export const productService = {
  getProductStats: async () => {
    try {
      const data = await apiClient.get('/api/products/stats');
      if (data) return data;
    } catch (e) {
      console.warn('Fallback getProductStats:', e.message);
    }
    const products = getStoredProducts().filter(p => p.RecordStatus === 0);
    return {
      TotalProducts: products.length,
      LowStockCount: products.filter(p => (parseFloat(p.StockQuantity) || 0) <= 15).length,
      PerishableCount: products.filter(p => p.IsExpDate).length,
      TotalStockUnits: products.reduce((acc, p) => acc + (parseFloat(p.StockQuantity) || 0), 0),
      TotalValuation: products.reduce((acc, p) => acc + ((parseFloat(p.Cost) || 0) * (parseFloat(p.StockQuantity) || 0)), 0)
    };
  },

  getTaxRates: async () => {
    try {
      const data = await apiClient.get('/api/tax-rates');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('Fallback getTaxRates:', e.message);
    }
    return [
      { Id: 'tax_0', Name: 'GST 0% (Exempt)', IGST: 0, CGST: 0, SGST: 0 },
      { Id: 'tax_5', Name: 'GST 5% Standard', IGST: 5, CGST: 2.5, SGST: 2.5 },
      { Id: 'tax_12', Name: 'GST 12% Standard', IGST: 12, CGST: 6, SGST: 6 },
      { Id: 'tax_18', Name: 'GST 18% Standard', IGST: 18, CGST: 9, SGST: 9 },
      { Id: 'tax_28', Name: 'GST 28% Luxury', IGST: 28, CGST: 14, SGST: 14 }
    ];
  },

  getCategories: async () => {
    try {
      const data = await apiClient.get('/api/categories');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('Fallback to local categories:', e.message);
    }
    return INITIAL_CATEGORIES;
  },

  getProducts: async ({ categoryId = 'cat_all', searchTerm = '' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (categoryId && categoryId !== 'cat_all') params.append('categoryId', categoryId);
      if (searchTerm) params.append('searchTerm', searchTerm);
      const data = await apiClient.get(`/api/products?${params.toString()}`);
      if (Array.isArray(data)) {
        saveStoredProducts(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local products:', e.message);
    }

    let list = getStoredProducts().filter(p => p.RecordStatus === 0);
    if (categoryId && categoryId !== 'cat_all') {
      list = list.filter(p => p.CategoryId === categoryId);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.Name.toLowerCase().includes(lower) || 
        p.ProductNumber.toLowerCase().includes(lower)
      );
    }
    return list;
  },

  getProductById: async (id) => {
    try {
      return await apiClient.get(`/api/products/${id}`);
    } catch (e) {
      const list = getStoredProducts();
      return list.find(p => p.Id === id) || null;
    }
  },

  getProductByBarcode: async (barcode) => {
    let clean = String(barcode || '').trim();
    if (!clean) return null;

    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        clean = String(parsed.barcode || parsed.ProductNumber || parsed.id || parsed.Id || clean).trim();
      } catch (e) {}
    }

    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1];
    }

    try {
      return await apiClient.get(`/api/products/barcode/${encodeURIComponent(clean)}`);
    } catch (e) {
      // Local fallback
      const list = getStoredProducts();
      return list.find(p => 
        (p.ProductNumber === clean || p.Id === clean || String(p.ProductNumber).toLowerCase() === clean.toLowerCase()) && 
        p.RecordStatus === 0
      ) || null;
    }
  },

  createProduct: async (productData) => {
    try {
      const created = await apiClient.post('/api/products', productData);
      const list = getStoredProducts();
      list.unshift(created);
      saveStoredProducts(list);
      return created;
    } catch (e) {
      console.warn('Fallback create local product:', e.message);
      const list = getStoredProducts();
      const newProduct = {
        Id: `prd_${Date.now()}`,
        ProductNumber: productData.ProductNumber || `200100${Date.now().toString().slice(-6)}`,
        Name: productData.Name,
        Cost: parseFloat(productData.Cost),
        Unit: String(productData.Unit || 'PCS').toUpperCase(),
        Ingredients: productData.Ingredients || '',
        Notes: productData.Notes || '',
        IsExpDate: !!productData.IsExpDate,
        Days: productData.IsExpDate ? parseInt(productData.Days, 10) : null,
        CategoryId: productData.CategoryId || 'cat_dairy',
        TaxRateId: productData.TaxRateId || 'tax_5',
        TaxPercent: productData.TaxPercent || 5,
        StockQuantity: parseFloat(productData.StockQuantity !== undefined ? productData.StockQuantity : 50),
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        CreatedId: 'user_admin_01',
        UpdatedId: 'user_admin_01'
      };
      list.unshift(newProduct);
      saveStoredProducts(list);
      return newProduct;
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const updated = await apiClient.put(`/api/products/${id}`, productData);
      const list = getStoredProducts();
      const index = list.findIndex(p => p.Id === id);
      if (index !== -1) {
        list[index] = updated;
        saveStoredProducts(list);
      }
      return updated;
    } catch (e) {
      const list = getStoredProducts();
      const index = list.findIndex(p => p.Id === id);
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...productData,
          Updated: new Date().toISOString()
        };
        saveStoredProducts(list);
        return list[index];
      }
      throw new Error('Product not found');
    }
  },

  softDeleteProduct: async (id) => {
    try {
      await apiClient.delete(`/api/products/${id}`);
    } catch (e) {
      console.warn('Fallback local softDeleteProduct:', e.message);
    }
    const list = getStoredProducts();
    const item = list.find(p => p.Id === id);
    if (item) {
      item.RecordStatus = 1;
      item.Updated = new Date().toISOString();
      saveStoredProducts(list);
      return true;
    }
    return false;
  }
};

export default productService;
