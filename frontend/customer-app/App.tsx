import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { COLORS } from './src/theme/colors';
import { CategoryType } from './src/types/product';
import { Home, LayoutGrid, ShoppingCart, Clock, User } from 'lucide-react-native';

type ActiveTab = 'HOME' | 'CATEGORIES' | 'CART' | 'ORDERS' | 'PROFILE';

const MainAppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('HOME');
  const [inCheckout, setInCheckout] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryType | undefined>(undefined);

  const { totalItemsCount } = useCart();

  const handleNavigateToCategories = (cat?: CategoryType) => {
    if (cat) setSelectedCategoryFilter(cat);
    setCurrentTab('CATEGORIES');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />

      {/* Screen Router Body */}
      <View style={styles.screenContainer}>
        {inCheckout ? (
          <CheckoutScreen
            onBack={() => setInCheckout(false)}
            onOrderSuccess={() => {
              setInCheckout(false);
              setCurrentTab('ORDERS');
            }}
          />
        ) : (
          <>
            {currentTab === 'HOME' && (
              <HomeScreen
                onNavigateToCart={() => setCurrentTab('CART')}
                onNavigateToCategories={handleNavigateToCategories}
              />
            )}
            {currentTab === 'CATEGORIES' && (
              <CategoriesScreen
                initialCategory={selectedCategoryFilter}
                onNavigateToCart={() => setCurrentTab('CART')}
              />
            )}
            {currentTab === 'CART' && (
              <CartScreen
                onNavigateToCheckout={() => setInCheckout(true)}
                onNavigateToHome={() => setCurrentTab('HOME')}
              />
            )}
            {currentTab === 'ORDERS' && (
              <OrdersScreen onNavigateToShop={() => setCurrentTab('HOME')} />
            )}
            {currentTab === 'PROFILE' && <ProfileScreen />}
          </>
        )}
      </View>

      {/* Bottom Tab Bar (Only when not in checkout) */}
      {!inCheckout && (
        <SafeAreaView style={styles.bottomNavContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('HOME')}
              activeOpacity={0.8}
            >
              <Home
                size={22}
                color={currentTab === 'HOME' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'HOME' && styles.tabLabelActive,
                ]}
              >
                Trang chủ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('CATEGORIES')}
              activeOpacity={0.8}
            >
              <LayoutGrid
                size={22}
                color={currentTab === 'CATEGORIES' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'CATEGORIES' && styles.tabLabelActive,
                ]}
              >
                Danh mục
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('CART')}
              activeOpacity={0.8}
            >
              <View style={{ position: 'relative' }}>
                <ShoppingCart
                  size={22}
                  color={currentTab === 'CART' ? COLORS.primary : COLORS.textMuted}
                />
                {totalItemsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalItemsCount > 99 ? '99+' : totalItemsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'CART' && styles.tabLabelActive,
                ]}
              >
                Giỏ hàng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('ORDERS')}
              activeOpacity={0.8}
            >
              <Clock
                size={22}
                color={currentTab === 'ORDERS' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'ORDERS' && styles.tabLabelActive,
                ]}
              >
                Đơn hàng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('PROFILE')}
              activeOpacity={0.8}
            >
              <User
                size={22}
                color={currentTab === 'PROFILE' ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'PROFILE' && styles.tabLabelActive,
                ]}
              >
                Tài khoản
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    height: 54,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 3,
  },
  tabLabelActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.discount,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 9,
    fontWeight: '800',
  },
});
