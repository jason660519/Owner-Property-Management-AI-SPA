import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function Sidebar() {
  const menuItems = [
    { icon: 'tachometer-alt', label: 'Dashboard', active: true },
    { icon: 'comment-dots', label: 'Messages' },
    { icon: 'home', label: 'Properties' },
    { icon: 'dollar-sign', label: 'Payments' },
    { icon: 'tools', label: 'Maintenance' },
    { icon: 'file-contract', label: 'Lease Profiles' },
    { icon: 'file-signature', label: 'Docs & E-Sign' },
  ];

  const renterItems = [
    { icon: 'user-friends', label: 'Leads' },
    { icon: 'file-alt', label: 'Applicants' },
    { icon: 'users', label: 'Tenants' },
  ];

  const accountingItems = [
    { icon: 'chart-bar', label: 'Insights' },
    { icon: 'receipt', label: 'Transactions' },
  ];

  const resourceItems = [
    { icon: 'toolbox', label: 'Toolbox' },
    { icon: 'users', label: 'Community' },
    { icon: 'question-circle', label: 'Need Help?' },
    { icon: 'gift', label: 'Give $25. Get $25.' },
  ];

  const MenuItem = ({ icon, label, active }: { icon: string; label: string; active?: boolean }) => (
    <TouchableOpacity style={[styles.menuItem, active && styles.activeMenuItem]}>
      <View style={{ width: 24, alignItems: 'center' }}>
        <FontAwesome5 name={icon} size={16} color="#fff" style={{ opacity: active ? 1 : 0.7 }} />
      </View>
      <Text style={[styles.menuText, active && styles.activeMenuText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Placeholder for Logo */}
        <Text style={styles.logoText}>Real Estate AI Manager</Text>
      </View>
      
      <TouchableOpacity style={styles.upgradeButton}>
        <FontAwesome5 name="star" size={14} color="#fff" />
        <Text style={styles.upgradeText}>Upgrade</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          {menuItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} active={item.active} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RENTERS</Text>
          {renterItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNTING</Text>
          {accountingItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESOURCES</Text>
          {resourceItems.map((item, index) => (
            <MenuItem key={index} icon={item.icon} label={item.label} />
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
         <View style={styles.avatar}>
            <FontAwesome5 name="user" size={12} color="#fff" />
         </View>
         <Text style={styles.accountText}>Account</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: '#0f2e46',
    height: '100%',
    paddingVertical: 10,
  },
  logoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: '#ff7f41',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 15,
    borderRadius: 4,
    marginBottom: 20,
    gap: 8
  },
  upgradeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#5c7c94',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  activeMenuItem: {
    backgroundColor: '#1a3b55',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    paddingLeft: 16,
  },
  menuText: {
    color: '#b0c4d1',
    fontSize: 14,
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
  },
  avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#5eafa6',
      justifyContent: 'center',
      alignItems: 'center'
  },
  accountText: {
      color: '#b0c4d1',
      fontSize: 14
  }

});
