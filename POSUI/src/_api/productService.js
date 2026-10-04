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
    Name: 'Cow Milk 500ml',
    Cost: 30.00,
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
    Id: 'prd_02',
    ProductNumber: '200100102002',
    Name: 'Whole Wheat Bread 400g',
    Cost: 40.00,
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
    Name: 'Cold Coffee 200ml',
    Cost: 45.00,
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
    Name: 'Royal Basmati Rice 1kg',
    Cost: 110.00,
    Ingredients: 'Aged long-grain basmati rice',
    Notes: 'Store in cool dry place',
    IsExpDate: false,
    Days: null,
    CategoryId: 'cat_staples',
    TaxRateId: 'tax_5',
    TaxPercent: 5,
    StockQuantity: 62,
    RecordStatus: 0
  },
  {
    Id: 'prd_05',
    ProductNumber: '200100105005',
    Name: 'Dark Chocolate Cake 500g',
    Cost: 350.00,
    Ingredients: 'Cocoa, butter, eggs, flour',
    Notes: 'Bakery fresh specialty',
    IsExpDate: true,
    Days: 4,
    CategoryId: 'cat_bakery',
    TaxRateId: 'tax_18',
    TaxPercent: 18,
    StockQuantity: 8,
    RecordStatus: 0
  },
  {
    Id: 'prd_06',
    ProductNumber: '200100106006',
    Name: 'Masala Potato Chips 100g',
    Cost: 20.00,
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

// Local state caching helper
const getStoredProducts = () => {
  const local = localStorage.getItem('pos_products');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
};

const saveStoredProducts = (products) => {
  localStorage.setItem('pos_products', JSON.stringify(products));
};

export const productService = {
  getCategories: async () => {
    return INITIAL_CATEGORIES;
  },

  getProducts: async ({ categoryId = 'cat_all', searchTerm = '' } = {}) => {
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

  getProductByBarcode: async (barcode) => {
    const list = getStoredProducts();
    let clean = String(barcode || '').trim();
    if (!clean) return null;

    // Check if QR code payload is JSON
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        clean = String(parsed.barcode || parsed.ProductNumber || parsed.id || parsed.Id || clean).trim();
      } catch (e) {
        // Continue with raw clean string
      }
    }

    // Check if payload is a URI (e.g. pos://product/200100101001)
    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1];
    }

    return list.find(p => 
      (p.ProductNumber === clean || p.Id === clean || String(p.ProductNumber).toLowerCase() === clean.toLowerCase()) && 
      p.RecordStatus === 0
    ) || null;
  },

  createProduct: async (productData) => {
    const list = getStoredProducts();
    const newProduct = {
      Id: `prd_${Date.now()}`,
      ProductNumber: productData.ProductNumber || `200100${Date.now().toString().slice(-6)}`,
      Name: productData.Name,
      Cost: parseFloat(productData.Cost),
      Ingredients: productData.Ingredients || '',
      Notes: productData.Notes || '',
      IsExpDate: !!productData.IsExpDate,
      Days: productData.IsExpDate ? parseInt(productData.Days, 10) : null,
      CategoryId: productData.CategoryId || 'cat_dairy',
      TaxRateId: productData.TaxRateId || 'tax_5',
      TaxPercent: productData.TaxPercent || 5,
      StockQuantity: parseInt(productData.StockQuantity || 50, 10),
      RecordStatus: 0,
      Created: new Date().toISOString(),
      Updated: new Date().toISOString(),
      CreatedId: 'user_admin_01',
      UpdatedId: 'user_admin_01'
    };
    list.unshift(newProduct);
    saveStoredProducts(list);
    return newProduct;
  },

  updateProduct: async (id, productData) => {
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
  },

  softDeleteProduct: async (id) => {
    const list = getStoredProducts();
    const item = list.find(p => p.Id === id);
    if (item) {
      item.RecordStatus = 1; // Soft delete
      item.Updated = new Date().toISOString();
      saveStoredProducts(list);
      return true;
    }
    return false;
  }
};

export default productService;
