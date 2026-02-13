import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setUser, useUser } from '../../store/user';
import { upgradeToEmail } from '@/services/authService';
import { auth } from '@/lib/firebase';
import { updateUserProfile } from '@/services/userService';
import { useGoogleAuth } from '@/services/googleAuth';
import PhoneVerification from '@/components/PhoneVerification';
import { signOut } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const POST_WIDTH = (width - 32) / 3 - 2; // 3-column grid with 2px gaps

// Sample data (replace with actual API calls)
const samplePosts = [
  { id: '1', type: 'image', image: 'https://picsum.photos/400/400', caption: 'Beautiful day!', likes: 42, comments: 5 },
  { id: '2', type: 'video', thumbnail: 'https://picsum.photos/400/401', caption: 'Fun times!', likes: 28, comments: 3 },
  { id: '3', type: 'image', image: 'https://picsum.photos/400/402', caption: 'Nature walk', likes: 56, comments: 8 },
  { id: '4', type: 'image', image: 'https://picsum.photos/400/403', caption: 'City lights', likes: 89, comments: 12 },
  { id: '5', type: 'video', thumbnail: 'https://picsum.photos/400/404', caption: 'Travel vlog', likes: 124, comments: 15 },
  { id: '6', type: 'image', image: 'https://picsum.photos/400/405', caption: 'Food adventure', likes: 67, comments: 9 },
];

const sampleMerchants = [
  { id: '1', name: 'Coffee Shop', image: 'https://picsum.photos/100/100', category: 'Food & Beverage' },
  { id: '2', name: 'Fashion Store', image: 'https://picsum.photos/100/101', category: 'Fashion' },
  { id: '3', name: 'Tech Store', image: 'https://picsum.photos/100/102', category: 'Electronics' },
];

const sampleFriends = [
  { id: '1', name: 'John Doe', image: 'https://picsum.photos/100/103', mutual: 12 },
  { id: '2', name: 'Jane Smith', image: 'https://picsum.photos/100/104', mutual: 8 },
  { id: '3', name: 'Mike Johnson', image: 'https://picsum.photos/100/105', mutual: 5 },
];

const sampleSavedPosts = [
  { id: '1', merchant: 'Coffee Shop', image: 'https://picsum.photos/300/200', title: 'Special Brew', date: '2 days ago' },
  { id: '2', merchant: 'Fashion Store', image: 'https://picsum.photos/300/201', title: 'Summer Collection', date: '1 week ago' },
];

const sampleRecentViews = [
  { id: '1', merchant: 'Tech Store', image: 'https://picsum.photos/300/202', title: 'New Gadgets', viewed: '10 min ago' },
  { id: '2', merchant: 'Coffee Shop', image: 'https://picsum.photos/300/203', title: 'Latte Art', viewed: '1 hour ago' },
];

export default function ProfileScreen() {
  const user = useUser();
  const { handleGoogleLogin } = useGoogleAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'collaborations' | 'tagged'>('posts');
  
  // Statistics states
  const [merchantFollowing, setMerchantFollowing] = useState(0);
  const [merchantFollowers, setMerchantFollowers] = useState(0);
  const [friendFollowers, setFriendFollowers] = useState(0);
  const [friendFollowing, setFriendFollowing] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [collaborationsCount, setCollaborationsCount] = useState(0);
  const [taggedPostsCount, setTaggedPostsCount] = useState(0);

  // Modal states
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<any[]>([]);

  // Settings modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSavedCategories, setShowSavedCategories] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showContentFilter, setShowContentFilter] = useState(false);
  const [showClosedFriends, setShowClosedFriends] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showPostHide, setShowPostHide] = useState(false);
  const [accountPrivacy, setAccountPrivacy] = useState<'public' | 'private'>('public');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Sample data for categories
  const [savedCategories, setSavedCategories] = useState([
    { id: '1', name: 'Coffee Shops', count: 12 },
    { id: '2', name: 'Fashion', count: 8 },
    { id: '3', name: 'Restaurants', count: 15 },
    { id: '4', name: 'Tech', count: 6 },
  ]);

  // Sample data for activity history
  const activityHistory = [
    { id: '1', type: 'like', content: 'Liked a post', time: '2 min ago', icon: 'heart', color: '#FF6B6B' },
    { id: '2', type: 'comment', content: 'Commented: "Great shot!"', time: '1 hour ago', icon: 'chatbubble', color: '#007AFF' },
    { id: '3', type: 'post', content: 'Posted a photo', time: '3 hours ago', icon: 'image', color: '#28a745' },
    { id: '4', type: 'delete', content: 'Deleted a post', time: '1 day ago', icon: 'trash', color: '#dc3545' },
    { id: '5', type: 'profile', content: 'Updated bio', time: '2 days ago', icon: 'person', color: '#8e8e93' },
  ];

  // Sample data for archive with map locations
  const archivePosts = [
    { id: '1', image: 'https://picsum.photos/400/400', location: 'Kuala Lumpur', date: '2024-02-13', lat: 3.1390, lng: 101.6869 },
    { id: '2', image: 'https://picsum.photos/400/401', location: 'Penang', date: '2024-02-10', lat: 5.4141, lng: 100.3288 },
    { id: '3', image: 'https://picsum.photos/400/402', location: 'Johor Bahru', date: '2024-02-05', lat: 1.4927, lng: 103.7414 },
  ];

  // Sample data for blocked users
  const blockedUsers = [
    { id: '1', name: 'Spam User 1', image: 'https://picsum.photos/100/106' },
    { id: '2', name: 'Spam User 2', image: 'https://picsum.photos/100/107' },
  ];

  // Sample data for hidden posts/stories
  const hiddenContent = [
    { id: '1', type: 'post', from: 'User A', preview: 'Summer vibes...', date: '1 week ago' },
    { id: '2', type: 'story', from: 'User B', preview: 'Story highlight', date: '3 days ago' },
  ];

  // Get active posts based on tab
  const getActivePosts = () => {
    switch (activeTab) {
      case 'posts':
        return samplePosts.slice(0, 6);
      case 'collaborations':
        return samplePosts.filter((_, i) => i % 2 === 0).slice(0, 6);
      case 'tagged':
        return samplePosts.filter((_, i) => i % 3 === 0).slice(0, 6);
      default:
        return samplePosts.slice(0, 6);
    }
  };

  const activePosts = getActivePosts();

  useEffect(() => {
    // Load user data and statistics
    loadUserData();
    loadStatistics();
  }, []);

  const loadUserData = async () => {
    setPhoneVerified(auth.currentUser?.phoneNumber ? true : false);
    setBio('Food lover and travel enthusiast 🍜✈️');
  };

  const loadStatistics = async () => {
    // Load statistics from your backend
    setMerchantFollowing(24);
    setMerchantFollowers(156);
    setFriendFollowers(842);
    setFriendFollowing(312);
    setPostsCount(45);
    setCollaborationsCount(8);
    setTaggedPostsCount(12);
  };

  const openSectionModal = (section: string) => {
    setSelectedSection(section);
    
    switch (section) {
      case 'merchant-following':
        setSectionData(sampleMerchants);
        break;
      case 'merchant-followers':
        setSectionData(sampleMerchants);
        break;
      case 'friend-followers':
      case 'friend-following':
        setSectionData(sampleFriends);
        break;
      case 'saved':
        setSectionData(sampleSavedPosts);
        break;
      case 'recently-viewed':
        setSectionData(sampleRecentViews);
        break;
    }
  };

  const closeModal = () => {
    setSelectedSection(null);
    setSectionData([]);
  };

  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.gridItem}>
      <Image source={{ uri: item.image || item.thumbnail }} style={styles.gridImage} />
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderModalItem = ({ item }: { item: any }) => {
    switch (selectedSection) {
      case 'merchant-following':
      case 'merchant-followers':
        return (
          <TouchableOpacity style={styles.merchantItem}>
            <Image source={{ uri: item.image }} style={styles.merchantImage} />
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{item.name}</Text>
              <Text style={styles.merchantCategory}>{item.category}</Text>
            </View>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Following</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      
      case 'friend-followers':
      case 'friend-following':
        return (
          <TouchableOpacity style={styles.friendItem}>
            <Image source={{ uri: item.image }} style={styles.friendImage} />
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{item.name}</Text>
              <Text style={styles.friendMutual}>{item.mutual} mutual friends</Text>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble" size={20} color="#007AFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      
      case 'saved':
        return (
          <TouchableOpacity style={styles.savedItem}>
            <Image source={{ uri: item.image }} style={styles.savedImage} />
            <View style={styles.savedInfo}>
              <Text style={styles.savedMerchant}>{item.merchant}</Text>
              <Text style={styles.savedTitle}>{item.title}</Text>
              <Text style={styles.savedDate}>{item.date}</Text>
            </View>
            <Ionicons name="bookmark" size={24} color="#FFD700" />
          </TouchableOpacity>
        );
      
      case 'recently-viewed':
        return (
          <TouchableOpacity style={styles.viewedItem}>
            <Image source={{ uri: item.image }} style={styles.viewedImage} />
            <View style={styles.viewedInfo}>
              <Text style={styles.viewedMerchant}>{item.merchant}</Text>
              <Text style={styles.viewedTitle}>{item.title}</Text>
              <Text style={styles.viewedTime}>{item.viewed}</Text>
            </View>
            <Ionicons name="time" size={24} color="#8e8e93" />
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  async function saveProfile() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await updateUserProfile(auth.currentUser.uid, {
        name,
        bio,
      });

      setUser({
        id: auth.currentUser.uid,
        name,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setShowEditProfile(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  const handlePhoneVerificationSuccess = () => {
    setPhoneVerified(true);
    setShowPhoneVerification(false);
    Alert.alert('Success', 'Phone number verified successfully!');
  };

  const handleProfileImageChange = () => {
    Alert.alert('Coming Soon', 'Profile picture upload feature coming soon');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              Alert.alert('Logged Out', 'You have been logged out successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to log out');
            }
          }
        }
      ]
    );
  };

  const EditProfileModal = () => (
    <Modal
      visible={showEditProfile}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEditProfile(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditProfile(false)}>
            <Ionicons name="close" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={saveProfile}>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Profile Picture */}
          <View style={styles.editProfileImageSection}>
            <TouchableOpacity onPress={handleProfileImageChange}>
              <View style={styles.editProfileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.editProfileImage} />
                ) : (
                  <View style={styles.editProfileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="#8e8e93" />
                  </View>
                )}
                <View style={styles.editProfileImageButton}>
                  <Ionicons name="camera" size={20} color="white" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Name</Text>
            <TextInput
              style={styles.editProfileInput}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Username */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Username</Text>
            <TextInput
              style={styles.editProfileInput}
              placeholder="username"
              value={user?.username || ''}
              onChangeText={(text) => {}}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Bio */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Bio</Text>
            <TextInput
              style={[styles.editProfileInput, styles.editProfileBioInput]}
              placeholder="Tell us about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Links */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Links</Text>
            <View style={styles.linkInputContainer}>
              <Ionicons name="link" size={20} color="#8e8e93" />
              <TextInput
                style={styles.linkInput}
                placeholder="Add your website"
                placeholderTextColor="#999"
              />
            </View>
            <TouchableOpacity style={styles.addLinkButton}>
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addLinkText}>Add another link</Text>
            </TouchableOpacity>
          </View>

          {/* Gender */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Gender</Text>
            <TouchableOpacity style={styles.genderSelector}>
              <Text style={styles.genderText}>Prefer not to say</Text>
              <Ionicons name="chevron-down" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Date of Birth */}
          <View style={styles.editProfileSection}>
            <Text style={styles.editProfileLabel}>Date of Birth</Text>
            <TouchableOpacity style={styles.datePicker}>
              <Text style={styles.dateText}>January 1, 1990</Text>
              <Ionicons name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const SavedCategoriesModal = () => (
    <Modal
      visible={showSavedCategories}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSavedCategories(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSavedCategories(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Saved Collections</Text>
          <TouchableOpacity>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Add New Category */}
          <TouchableOpacity style={styles.addCategoryCard}>
            <View style={styles.addCategoryIcon}>
              <Ionicons name="add" size={32} color="#007AFF" />
            </View>
            <View style={styles.addCategoryTextContainer}>
              <Text style={styles.addCategoryTitle}>Create New Collection</Text>
              <Text style={styles.addCategorySubtitle}>Group your saved posts</Text>
            </View>
          </TouchableOpacity>

          {/* Categories List */}
          {savedCategories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryIcon}>
                <Ionicons name="folder" size={32} color="#007AFF" />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.count} posts</Text>
              </View>
              <TouchableOpacity style={styles.categoryMenu}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const ActivityHistoryModal = () => (
    <Modal
      visible={showActivityHistory}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowActivityHistory(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowActivityHistory(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Activity History</Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={activityHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.modalContent}
          renderItem={({ item }) => (
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>{item.content}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </Modal>
  );

  const ArchiveModal = () => (
    <Modal
      visible={showArchive}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowArchive(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowArchive(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Archive</Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#1c1c1e" />
          </TouchableOpacity>
        </View>

        {/* Date Filter */}
        <View style={styles.dateFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['today', 'week', 'month', 'custom'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.dateFilterChip,
                  selectedDateFilter === filter && styles.dateFilterChipActive
                ]}
                onPress={() => {
                  setSelectedDateFilter(filter as any);
                  if (filter === 'custom') setShowDatePicker(true);
                }}
              >
                <Text style={[
                  styles.dateFilterText,
                  selectedDateFilter === filter && styles.dateFilterTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Map View Toggle */}
        <View style={styles.archiveViewToggle}>
          <TouchableOpacity style={[styles.viewToggleButton, styles.viewToggleActive]}>
            <Ionicons name="grid" size={20} color="white" />
            <Text style={styles.viewToggleTextActive}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewToggleButton}>
            <Ionicons name="map" size={20} color="#8e8e93" />
            <Text style={styles.viewToggleText}>Map</Text>
          </TouchableOpacity>
        </View>

        {/* Archive Posts Grid */}
        <View style={styles.archiveGrid}>
          {archivePosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.archiveItem}>
              <Image source={{ uri: post.image }} style={styles.archiveImage} />
              <View style={styles.archiveInfo}>
                <Ionicons name="location" size={12} color="white" />
                <Text style={styles.archiveLocation}>{post.location}</Text>
                <Text style={styles.archiveDate}>{post.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const ContentFilterModal = () => (
    <Modal
      visible={showContentFilter}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowContentFilter(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowContentFilter(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Content Preferences</Text>
          <TouchableOpacity>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Interested */}
          <View style={styles.contentFilterSection}>
            <Text style={styles.contentFilterTitle}>Interested</Text>
            <View style={styles.interestedTags}>
              {['Coffee', 'Travel', 'Food', 'Fashion', 'Technology', 'Art'].map((tag) => (
                <TouchableOpacity key={tag} style={styles.interestedTag}>
                  <Text style={styles.interestedTagText}>{tag}</Text>
                  <Ionicons name="close" size={16} color="#8e8e93" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addInterestedButton}>
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addInterestedText}>Add interests</Text>
            </TouchableOpacity>
          </View>

          {/* Not Interested */}
          <View style={styles.contentFilterSection}>
            <Text style={styles.contentFilterTitle}>Not Interested</Text>
            <View style={styles.notInterestedTags}>
              {['Politics', 'Sports', 'Gaming'].map((tag) => (
                <TouchableOpacity key={tag} style={styles.notInterestedTag}>
                  <Text style={styles.notInterestedTagText}>{tag}</Text>
                  <Ionicons name="close" size={16} color="#8e8e93" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addInterestedButton}>
              <Ionicons name="add" size={20} color="#dc3545" />
              <Text style={[styles.addInterestedText, { color: '#dc3545' }]}>Add to not interested</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const ClosedFriendsModal = () => (
    <Modal
      visible={showClosedFriends}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowClosedFriends(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowClosedFriends(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Close Friends</Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#1c1c1e" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.closeFriendsInfo}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.closeFriendsInfoText}>
              Only your close friends can see stories and posts shared with this list
            </Text>
          </View>

          <View style={styles.closeFriendsList}>
            <Text style={styles.closeFriendsSectionTitle}>Suggestions</Text>
            {sampleFriends.map((friend) => (
              <TouchableOpacity key={friend.id} style={styles.closeFriendItem}>
                <Image source={{ uri: friend.image }} style={styles.closeFriendImage} />
                <View style={styles.closeFriendInfo}>
                  <Text style={styles.closeFriendName}>{friend.name}</Text>
                  <Text style={styles.closeFriendMutual}>{friend.mutual} mutual friends</Text>
                </View>
                <TouchableOpacity style={styles.addCloseFriendButton}>
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const BlockedUsersModal = () => (
    <Modal
      visible={showBlockedUsers}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBlockedUsers(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowBlockedUsers(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Blocked Users</Text>
          <TouchableOpacity>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {blockedUsers.length > 0 ? (
            blockedUsers.map((user) => (
              <View key={user.id} style={styles.blockedUserItem}>
                <Image source={{ uri: user.image }} style={styles.blockedUserImage} />
                <Text style={styles.blockedUserName}>{user.name}</Text>
                <TouchableOpacity style={styles.unblockButton}>
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield" size={48} color="#8e8e93" />
              <Text style={styles.emptyStateTitle}>No blocked users</Text>
              <Text style={styles.emptyStateSubtitle}>
                Users you block will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const PostHideModal = () => (
    <Modal
      visible={showPostHide}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPostHide(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPostHide(false)}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Hidden Content</Text>
          <TouchableOpacity>
            <Ionicons name="options" size={24} color="#1c1c1e" />
          </TouchableOpacity>
        </View>

        <View style={styles.hiddenContentTabs}>
          <TouchableOpacity style={[styles.hiddenTab, styles.hiddenTabActive]}>
            <Text style={[styles.hiddenTabText, styles.hiddenTabTextActive]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hiddenTab}>
            <Text style={styles.hiddenTabText}>Stories</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {hiddenContent.map((item) => (
            <TouchableOpacity key={item.id} style={styles.hiddenContentItem}>
              <View style={styles.hiddenContentIcon}>
                <Ionicons 
                  name={item.type === 'post' ? 'document-text' : 'time'} 
                  size={24} 
                  color="#8e8e93" 
                />
              </View>
              <View style={styles.hiddenContentInfo}>
                <Text style={styles.hiddenContentFrom}>{item.from}</Text>
                <Text style={styles.hiddenContentPreview}>{item.preview}</Text>
                <Text style={styles.hiddenContentDate}>{item.date}</Text>
              </View>
              <TouchableOpacity style={styles.unhideButton}>
                <Text style={styles.unhideButtonText}>Unhide</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const SettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings & Activity</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowSettings(false)}
          >
            <Ionicons name="close" size={24} color="#1c1c1e" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsContent}>
          {/* Edit Profile - Now as Touchable Button */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowEditProfile(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Edit Profile</Text>
              <Text style={styles.settingsItemSubtitle}>Name, username, bio, links</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* A. Tool Section */}
          <View style={styles.settingsSectionHeader}>
            <Text style={styles.settingsSectionTitle}>Tools</Text>
          </View>

          {/* Saved with Categories */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowSavedCategories(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="bookmark" size={24} color="#FF9800" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Saved</Text>
              <Text style={styles.settingsItemSubtitle}>Collections • {savedCategories.length} categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Recently Viewed */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => openSectionModal('recently-viewed'), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="time" size={24} color="#28a745" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Recently Viewed</Text>
              <Text style={styles.settingsItemSubtitle}>Posts you've viewed</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Activity History */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowActivityHistory(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="list" size={24} color="#9C27B0" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Activity History</Text>
              <Text style={styles.settingsItemSubtitle}>Comments, likes, posts, profile changes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Archive */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowArchive(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E0F2F1' }]}>
              <Ionicons name="archive" size={24} color="#009688" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Archive</Text>
              <Text style={styles.settingsItemSubtitle}>Map view • Date filter</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Content Filter */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowContentFilter(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="options" size={24} color="#dc3545" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Content Preferences</Text>
              <Text style={styles.settingsItemSubtitle}>Interested & Not interested</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* B. Privacy Section */}
          <View style={styles.settingsSectionHeader}>
            <Text style={styles.settingsSectionTitle}>Privacy</Text>
          </View>

          {/* Close Friends */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowClosedFriends(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E8EAF6' }]}>
              <Ionicons name="people" size={24} color="#3F51B5" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Close Friends</Text>
              <Text style={styles.settingsItemSubtitle}>Share stories with specific people</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Account Privacy */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              Alert.alert(
                'Account Privacy',
                `Switch to ${accountPrivacy === 'public' ? 'private' : 'public'} account?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Switch',
                    onPress: () => setAccountPrivacy(accountPrivacy === 'public' ? 'private' : 'public')
                  }
                ]
              );
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E0F7FA' }]}>
              <Ionicons name={accountPrivacy === 'public' ? 'globe' : 'lock-closed'} size={24} color="#00ACC1" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Account Privacy</Text>
              <Text style={styles.settingsItemSubtitle}>
                {accountPrivacy === 'public' ? 'Public' : 'Private'} • Tap to switch
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Blocked Users */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowBlockedUsers(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="ban" size={24} color="#dc3545" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Blocked</Text>
              <Text style={styles.settingsItemSubtitle}>
                {blockedUsers.length} users blocked
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Hide Posts/Stories */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowPostHide(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="eye-off" size={24} color="#FF9800" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Hide Content</Text>
              <Text style={styles.settingsItemSubtitle}>Posts & stories hidden from you</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Phone Verification */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              setShowSettings(false);
              setTimeout(() => setShowPhoneVerification(true), 300);
            }}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: phoneVerified ? '#E8F5E9' : '#FFEBEE' }]}>
              <Ionicons 
                name="call" 
                size={24} 
                color={phoneVerified ? '#28a745' : '#dc3545'} 
              />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Phone Verification</Text>
              <Text style={styles.settingsItemSubtitle}>
                {phoneVerified ? 'Verified' : 'Not verified'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Account Security */}
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={handleGoogleLogin}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="shield" size={24} color="#28a745" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsItemTitle}>Account Security</Text>
              <Text style={styles.settingsItemSubtitle}>Google account • Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Log Out */}
          <TouchableOpacity 
            style={[styles.settingsItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="log-out" size={24} color="#dc3545" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={[styles.settingsItemTitle, styles.logoutText]}>Log Out</Text>
              <Text style={styles.settingsItemSubtitle}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* All Modals */}
      <EditProfileModal />
      <SavedCategoriesModal />
      <ActivityHistoryModal />
      <ArchiveModal />
      <ContentFilterModal />
      <ClosedFriendsModal />
      <BlockedUsersModal />
      <PostHideModal />
    </Modal>
  );

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
        <Text style={styles.fixedHeaderTitle}>{name || 'Profile'}</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings" size={22} color="#1c1c1e" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Settings Button */}
          <TouchableOpacity 
            style={styles.topSettingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings" size={24} color="#1c1c1e" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleProfileImageChange}>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={50} color="#8e8e93" />
                  </View>
                )}
                <View style={styles.editImageButton}>
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              {/* Row 1 */}
              <View style={styles.statsRow}>
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => openSectionModal('friend-followers')}
                >
                  <Text style={styles.statNumber}>{friendFollowers}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => openSectionModal('merchant-followers')}
                >
                  <Text style={styles.statNumber}>{merchantFollowers}</Text>
                  <Text style={styles.statLabel}>Merchant{'\n'}Followers</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.statsRow}>
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => openSectionModal('friend-following')}
                >
                  <Text style={styles.statNumber}>{friendFollowing}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={() => openSectionModal('merchant-following')}
                >
                  <Text style={styles.statNumber}>{merchantFollowing}</Text>
                  <Text style={styles.statLabel}>Merchant{'\n'}Following</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name || 'Your Name'}</Text>
            {bio ? <Text style={styles.userBio}>{bio}</Text> : null}
          </View>
        </View>

        {/* Posts Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons 
              name="grid" 
              size={24} 
              color={activeTab === 'posts' ? '#007AFF' : '#8e8e93'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'posts' && styles.activeTabText
            ]}>
              Posts ({postsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tab, activeTab === 'collaborations' && styles.activeTab]}
            onPress={() => setActiveTab('collaborations')}
          >
            <Ionicons 
              name="business" 
              size={24} 
              color={activeTab === 'collaborations' ? '#28a745' : '#8e8e93'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'collaborations' && styles.activeTabText
            ]}>
              Collaborations ({collaborationsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tagged' && styles.activeTab]}
            onPress={() => setActiveTab('tagged')}
          >
            <Ionicons 
              name="person" 
              size={24} 
              color={activeTab === 'tagged' ? '#FF6B6B' : '#8e8e93'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'tagged' && styles.activeTabText
            ]}>
              Tagged ({taggedPostsCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.gridContainer}>
          {activePosts.map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem}>
              <Image source={{ uri: item.image || item.thumbnail }} style={styles.gridImage} />
              {item.type === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="play" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Phone Verification Modal */}
      <Modal
        visible={showPhoneVerification}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Your Phone</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPhoneVerification(false)}
            >
              <Ionicons name="close" size={24} color="#1c1c1e" />
            </TouchableOpacity>
          </View>
          <PhoneVerification onSuccess={handlePhoneVerificationSuccess} />
        </View>
      </Modal>

      {/* Section Detail Modal */}
      <Modal
        visible={!!selectedSection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedSection === 'merchant-following' && 'Following Merchants'}
              {selectedSection === 'merchant-followers' && 'Merchant Followers'}
              {selectedSection === 'friend-followers' && 'Friend Followers'}
              {selectedSection === 'friend-following' && 'Following Friends'}
              {selectedSection === 'saved' && 'Saved Posts'}
              {selectedSection === 'recently-viewed' && 'Recently Viewed'}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeModal}
            >
              <Ionicons name="close" size={24} color="#1c1c1e" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={sectionData}
            renderItem={renderModalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Settings Modal */}
      <SettingsModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    paddingTop: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  fixedHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  settingsButton: {
    padding: 8,
  },
  topSettingsButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    backgroundColor: 'white',
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  statsContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  userInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    marginTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
    backgroundColor: 'white',
  },
  gridItem: {
    width: POST_WIDTH,
    height: POST_WIDTH,
    margin: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  merchantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  merchantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  merchantCategory: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  friendImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  friendMutual: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  messageButton: {
    padding: 8,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  savedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  savedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savedMerchant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  savedTitle: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  savedDate: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  viewedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  viewedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  viewedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  viewedMerchant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  viewedTitle: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  viewedTime: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  // Settings Modal Styles
  settingsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  settingsContent: {
    flex: 1,
    padding: 16,
  },
  settingsSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 12,
    color: '#8e8e93',
  },
  logoutItem: {
    borderColor: '#f8d7da',
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#dc3545',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5ea',
    marginVertical: 16,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Edit Profile Styles
  editProfileImageSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  editProfileImageContainer: {
    position: 'relative',
  },
  editProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editProfileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  editProfileSection: {
    marginBottom: 24,
  },
  editProfileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  editProfileInput: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1c1c1e',
    backgroundColor: '#f8f9fa',
  },
  editProfileBioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  linkInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    marginLeft: 8,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addLinkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  genderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  genderText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dateText: {
    fontSize: 16,
    color: '#1c1c1e',
  },

  // Saved Categories Styles
  addCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addCategoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  addCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  addCategorySubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  categoryCount: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  categoryMenu: {
    padding: 8,
  },

  // Activity History Styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  activityTime: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },

  // Archive Styles
  dateFilterContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  dateFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  dateFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  dateFilterTextActive: {
    color: 'white',
  },
  archiveViewToggle: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  viewToggleActive: {
    backgroundColor: '#007AFF',
  },
  viewToggleText: {
    fontSize: 14,
    color: '#8e8e93',
    marginLeft: 8,
  },
  viewToggleTextActive: {
    color: 'white',
  },
  archiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  archiveItem: {
    width: (width - 32) / 3 - 2,
    height: (width - 32) / 3 - 2,
    margin: 1,
    position: 'relative',
  },
  archiveImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  archiveInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  archiveLocation: {
    color: 'white',
    fontSize: 10,
    marginLeft: 4,
  },
  archiveDate: {
    color: 'white',
    fontSize: 10,
    marginLeft: 8,
  },

  // Content Filter Styles
  contentFilterSection: {
    marginBottom: 24,
  },
  contentFilterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  interestedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestedTagText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  notInterestedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  notInterestedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  notInterestedTagText: {
    fontSize: 14,
    color: '#dc3545',
    marginRight: 4,
  },
  addInterestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addInterestedText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Close Friends Styles
  closeFriendsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  closeFriendsInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
  },
  closeFriendsList: {
    marginBottom: 20,
  },
  closeFriendsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 12,
  },
  closeFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  closeFriendImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  closeFriendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  closeFriendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  closeFriendMutual: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  addCloseFriendButton: {
    padding: 8,
  },

  // Blocked Users Styles
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  blockedUserImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  blockedUserName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginLeft: 12,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  unblockButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
  },

  // Hidden Content Styles
  hiddenContentTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  hiddenTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  hiddenTabActive: {
    borderBottomColor: '#007AFF',
  },
  hiddenTabText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  hiddenTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  hiddenContentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  hiddenContentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenContentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hiddenContentFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  hiddenContentPreview: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  hiddenContentDate: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  unhideButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  unhideButtonText: {
    fontSize: 12,
    color: '#1c1c1e',
  },
});