import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, List, Avatar, Button, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { BarberTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BarberTabParamList, 'BarberProfile'>;

export const BarberProfileScreen: React.FC<Props> = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Avatar.Text
          size={80}
          label={user?.name?.charAt(0) || 'B'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>{user?.name}</Text>
        <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
        <Text variant="bodySmall" style={styles.role}>理髮師</Text>
      </View>

      <Card style={styles.menuCard}>
        <List.Item
          title="編輯個人資料"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('提示', '功能開發中')}
        />
        <Divider />
        <List.Item
          title="通知設定"
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('提示', '功能開發中')}
        />
        <Divider />
        <List.Item
          title="關於"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('關於', 'AZ Barber v1.0.0')}
        />
      </Card>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor="#F44336"
      >
        登出
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  name: {
    marginTop: 12,
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  role: {
    color: '#2196F3',
    marginTop: 4,
  },
  menuCard: {
    margin: 16,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderColor: '#F44336',
  },
});
