import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, color: 'red', fontWeight: 'bold' }}>
        ✅ Expo Web 正常運行！
      </Text>
      <Text style={{ fontSize: 18, color: 'blue', marginTop: 20 }}>
        如果你看到這個訊息，代表 React Native Web 已經成功渲染
      </Text>
      <Text style={{ fontSize: 14, color: 'gray', marginTop: 10 }}>
        端口: http://localhost:8081
      </Text>
    </View>
  );
}
