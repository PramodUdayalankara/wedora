-- ==============================================================================
-- WEDORA SAMPLE SEED DATA FOR SUPABASE
-- ==============================================================================

-- Sample Products
INSERT INTO public.products (product_code, name, category, size, description, unit_price, is_active) VALUES
('PRD-101', 'Artisanal Bonbon Box (12 pcs)', 'Luxury Boxes', 'Box of 12', 'Hand-painted dark and milk chocolate bonbons filled with passion fruit ganache, salted caramel, and Ceylon espresso.', 4200.00, true),
('PRD-102', 'Grand Truffle Collection (24 pcs)', 'Luxury Boxes', 'Box of 24', 'Velvety Belgian chocolate truffles dusted with Dutch cocoa, roasted pistachios, and hazelnut praline.', 7800.00, true),
('PRD-103', 'Custom Name Embossed Chocolate Bar', 'Custom Bars', '150g Bar', 'Custom gold-dusted chocolate bar with personalized custom letter embossing and dry fruits topping.', 1850.00, true),
('PRD-104', 'Wedding Favor Chocolate Keepsake (Twin)', 'Wedding Favors', 'Box of 2', 'Elegant miniature drawer box with custom gold foil initials and 2 gourmet pralines.', 850.00, true),
('PRD-105', 'Royal Celebration Chocolate Hamper', 'Hampers', 'Grand Hamper', 'Handwoven royal navy hamper with 24 bonbons, 2 custom bars, hot chocolate blend, and chocolate-coated almonds.', 16500.00, true),
('PRD-106', 'Ruby & Dark Berry Blossom Bouquet', 'Bouquets', 'Standard Bouquet', 'Bouquet arrangement of strawberry ruby chocolate roses and 70% single-origin dark chocolate spheres.', 6500.00, true),
('PRD-107', 'Celebration Chocolate Smash Heart & Mallet', 'Specialty', 'Standard', 'Hollow Belgian chocolate heart filled with hidden truffles, marshmallows, and custom anniversary note, with wooden mallet.', 5500.00, true),
('PRD-108', 'Sugar-Free Dark Chocolate Almond Slab', 'Health & Keto', '200g Slab', '72% Sugar-free dark chocolate sweetened with stevia, studded with roasted Californian almonds.', 2400.00, true)
ON CONFLICT (product_code) DO NOTHING;

-- Sample Customers (Sri Lankan contacts)
INSERT INTO public.customers (customer_code, full_name, phone, whatsapp, address, notes) VALUES
('CUST-1001', 'Dilini Senanayake', '+94 77 234 5678', '+94 77 234 5678', 'No 18/4, Alfred House Gardens, Colombo 03', 'VIP customer. Prefers gold ribbon packaging and dark chocolate variants.'),
('CUST-1002', 'Kavinda Perera', '+94 71 889 1234', '+94 71 889 1234', '452 Havelock Road, Colombo 06', 'Corporate orders coordinator for Millennium IT.'),
('CUST-1003', 'Dr. Ruwani Alwis', '+94 76 554 9876', '+94 76 554 9876', '22/A, Kandy Road, Kiribathgoda', 'Wedding chocolate favors client. Requires nut-free labeling.'),
('CUST-1004', 'Sachith Wickramasinghe', '+94 70 345 6789', '+94 70 345 6789', '78 Barnes Place, Colombo 07', 'Regular anniversary orders. Contact via WhatsApp only.')
ON CONFLICT (customer_code) DO NOTHING;
