import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { cssInterop } from "nativewind";

// Hardcoded matching colors from tailwind.config.js for Icon props
const ICON_COLORS = {
  white: '#ffffff',
  muted: '#666666',
  accent: '#703BF7',
};

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

  // Define types for MenuItem props
  interface MenuItemProps {
      icon: string;
      label: string;
      active?: boolean;
  }

  const MenuItem = ({ icon, label, active }: MenuItemProps) => (
    <TouchableOpacity 
      className={`flex-row items-center py-2.5 px-5 gap-3 ${active ? 'bg-bg-tertiary border-r-4 border-r-accent' : ''}`}
    >
      <View className="w-6 items-center">
        <FontAwesome5 
          name={icon} 
          size={16} 
          color={active ? ICON_COLORS.white : ICON_COLORS.white} 
          style={{ opacity: active ? 1 : 0.7 }} 
        />
      </View>
      <Text className={`text-sm ${active ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="w-60 bg-bg-secondary h-full py-2.5 border-r border-border-light">
      <View className="px-5 mb-5 flex-row items-center gap-2.5">
        <View className="w-8 h-8 bg-accent rounded-sm items-center justify-center">
             <FontAwesome5 name="building" size={20} color={ICON_COLORS.white} />
        </View>
        <Text className="text-text-primary text-xl font-bold">Landlord</Text>
      </View>

      <TouchableOpacity className="mx-4 mb-5 bg-accent rounded-sm py-2.5 flex-row items-center justify-center gap-2">
        <FontAwesome5 name="crown" size={14} color={ICON_COLORS.white} />
        <Text className="text-text-primary text-sm font-semibold">Upgrade to Premium</Text>
      </TouchableOpacity>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mb-5">
            <Text className="text-text-muted text-xs font-semibold px-5 mb-2 uppercase">Rental Management</Text>
            {menuItems.map((item, index) => (
                <MenuItem key={index} icon={item.icon} label={item.label} active={item.active} />
            ))}
        </View>

        <View className="mb-5">
            <Text className="text-text-muted text-xs font-semibold px-5 mb-2 uppercase">Renters</Text>
            {renterItems.map((item, index) => (
                <MenuItem key={index} icon={item.icon} label={item.label} />
            ))}
        </View>

        <View className="mb-5">
            <Text className="text-text-muted text-xs font-semibold px-5 mb-2 uppercase">Accounting</Text>
            {accountingItems.map((item, index) => (
                <MenuItem key={index} icon={item.icon} label={item.label} />
            ))}
        </View>

        <View className="mb-8">
            <Text className="text-text-muted text-xs font-semibold px-5 mb-2 uppercase">Resources</Text>
            {resourceItems.map((item, index) => (
                <MenuItem key={index} icon={item.icon} label={item.label} />
            ))}
        </View>
      </ScrollView>
      
      <View className="p-4 border-t border-border-light flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-full bg-bg-tertiary items-center justify-center">
             <FontAwesome5 name="user" size={14} color={ICON_COLORS.white} />
        </View>
        <View>
            <Text className="text-text-primary text-sm font-medium">My Account</Text>
            <Text className="text-text-muted text-xs">Landlord ID: 8832</Text>
        </View>
      </View>
    </View>
  );
}
