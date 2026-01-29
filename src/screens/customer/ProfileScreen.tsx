import React from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, Avatar, List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { ProfileStackParamList } from '../../navigation/types';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleSignOut = () => {
    Alert.alert(
      '登出',
      '確定要登出嗎？',
      [
        { text: '取消', style: 'cancel' },
        { text: '登出', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'customer':
        return '顧客';
      case 'barber':
        return '理髮師';
      case 'owner':
        return '店長';
      default:
        return role;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Image
            size={80}
            source={
              user?.avatar_url
                ? { uri: user.avatar_url }
                : require('../../../assets/icon.png')
            }
          />
          <Text variant="headlineSmall" style={styles.userName}>
            {user?.name || '未設定名稱'}
          </Text>
          <Text variant="bodyMedium" style={styles.userRole}>
            {getRoleText(user?.role || 'customer')}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <List.Item
          title="電子郵件"
          description={user?.email || '未設定'}
          left={(props) => <List.Icon {...props} icon="email" />}
        />
        <Divider />
        <List.Item
          title="電話"
          description={user?.phone || '未設定'}
          left={(props) => <List.Icon {...props} icon="phone" />}
        />
      </Card>

      <Card style={styles.menuCard}>
        <List.Item
          title="編輯個人資料"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title="通知設定"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => console.log('Notification settings')}
        />
        <Divider />
        <List.Item
          title="關於我們"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => console.log('About')}
        />
      </Card>

      {/* 管理端入口 - 只對理髮師和店長顯示 */}
      {(user?.role === 'barber' || user?.role === 'owner') && (
        <Card style={styles.menuCard}>
          <List.Item
            title="管理後台"
            description="查看預約、管理時段"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Go to management')}
          />
        </Card>
      )}

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor="#f44336"
      >
        登出
      </Button>

      <Text variant="bodySmall" style={styles.version}>
        版本 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  userName: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderColor: '#f44336',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 32,
  },
});
