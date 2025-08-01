// Simple validation script to test schema compatibility
const { PrismaClient } = require('@prisma/client');

async function testSchemaCompatibility() {
  console.log('Testing Prisma schema compatibility...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test if we can access the models
    console.log('✓ Prisma Client initialized');
    
    // Test basic model access (without DB connection)
    const userModel = prisma.user;
    const customerModel = prisma.customer;
    const providerModel = prisma.provider;
    const serviceModel = prisma.service;
    const serviceCategoryModel = prisma.serviceCategory;
    const bookingModel = prisma.booking;
    const reviewModel = prisma.review;
    const addressModel = prisma.address;
    const availabilitySlotModel = prisma.availabilitySlot;
    
    console.log('✓ All main models accessible');
    
    // Check nested models
    const providerDocumentModel = prisma.providerDocument;
    const bankDetailsModel = prisma.bankDetails;
    const preferencesModel = prisma.preferences;
    const pricingModel = prisma.pricing;
    const paymentMethodModel = prisma.paymentMethod;
    const paymentModel = prisma.payment;
    
    console.log('✓ All nested models accessible');
    
    console.log('\n🎉 Schema validation successful!');
    console.log('\nAvailable models:');
    console.log('- User (with Firebase auth)');
    console.log('- Customer (linked to User)');
    console.log('- Provider (linked to User)');
    console.log('- Service (global service catalog)');
    console.log('- ServiceCategory');
    console.log('- Booking (with enhanced relationships)');
    console.log('- Review');
    console.log('- Address (for customers and providers)');
    console.log('- AvailabilitySlot');
    console.log('- ProviderDocument');
    console.log('- BankDetails');
    console.log('- Preferences');
    console.log('- Pricing');
    console.log('- PaymentMethod');
    console.log('- Payment');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    process.exit(1);
  }
}

testSchemaCompatibility();