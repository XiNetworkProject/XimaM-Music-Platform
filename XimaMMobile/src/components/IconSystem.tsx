import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ViewStyle } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// Mapping des icônes Lucide vers Material Design
const iconMapping: Record<string, string> = {
  // Icônes de base
  'music': 'music-note',
  'play': 'play-arrow',
  'pause': 'pause',
  'heart': 'favorite',
  'heart-outline': 'favorite-border',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'clock': 'access-time',
  'headphones': 'headphones',
  'users': 'people',
  'trending-up': 'trending-up',
  'star': 'star',
  'zap': 'flash-on',
  'flame': 'local-fire-department',
  'calendar': 'calendar-today',
  'user-plus': 'person-add',
  'sparkles': 'auto-awesome',
  'crown': 'emoji-events',
  'radio': 'radio',
  'disc': 'album',
  'mic': 'mic',
  'refresh': 'refresh',
  'share': 'share',
  'eye': 'visibility',
  'award': 'emoji-events',
  'target': 'gps-fixed',
  'compass': 'explore',
  'bar-chart': 'bar-chart',
  'gift': 'card-giftcard',
  'lightbulb': 'lightbulb',
  'globe': 'public',
  'search': 'search',
  'list': 'list',
  'activity': 'timeline',
  'x': 'close',
  'newspaper': 'article',
  'download': 'download',
           'arrow-right': 'arrow-forward',
         
         // Icônes d'authentification
  'mail': 'email',
  'lock': 'lock',
  'eye-off': 'visibility-off',
  'eye-on': 'visibility',
  
  // Icônes de navigation
  'home': 'home',
  'library': 'library-music',
  'message-circle': 'chat',
  'settings': 'settings',
  'user': 'person',
  
  // Icônes de statistiques
  'music-note': 'music-note',
  'play-circle': 'play-circle-outline',
  'chat-bubble': 'chat-bubble-outline',
  
  // Icônes d'actions
  'plus': 'add',
  'minus': 'remove',
  'edit': 'edit',
  'delete': 'delete',
  'more': 'more-vert',
  'check': 'check',
  'close': 'close',
  
  // Icônes de statut
  'wifi': 'wifi',
  'wifi-off': 'wifi-off',
  'bluetooth': 'bluetooth',
  'volume': 'volume-up',
  'volume-off': 'volume-off',
  'mute': 'volume-off',
  
  // Icônes de temps
  'time': 'access-time',
  'date': 'event',
  'schedule': 'schedule',
  
  // Icônes de localisation
  'map-pin': 'location-on',
  'navigation': 'navigation',
  
  // Icônes de communication
  'phone': 'phone',
  'message': 'message',
  'notification': 'notifications',
  'notification-off': 'notifications-off',
  
  // Icônes de fichiers
  'file': 'insert-drive-file',
  'folder': 'folder',
  'image': 'image',
  'video': 'video-library',
  'audio': 'audiotrack',
  
  // Icônes de réseau
  'signal': 'signal-cellular-4-bar',
  'cloud': 'cloud',
  'sync': 'sync',
  
  // Icônes de sécurité
  'shield': 'security',
  'lock-open': 'lock-open',
  'key': 'vpn-key',
  
  // Icônes de préférences
  'theme': 'palette',
  'language': 'language',
  'accessibility': 'accessibility',
  'privacy': 'privacy-tip',
  
  // Icônes de support
  'help': 'help',
  'info': 'info',
  'warning': 'warning',
  'error': 'error',
           'success': 'check-circle',
       };

export const IconSystem: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#FFFFFF', 
  style 
}) => {
  const iconName = iconMapping[name] || name;
  
  return (
    <Icon 
      name={iconName} 
      size={size} 
      color={color} 
      style={style}
    />
  );
};

// Composants d'icônes spécialisées pour une utilisation plus facile
export const MusicIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="music" {...props} />
);

export const PlayIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="play" {...props} />
);

export const PauseIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="pause" {...props} />
);

export const HeartIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="heart" {...props} />
);

export const HeartOutlineIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="heart-outline" {...props} />
);

export const HomeIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="home" {...props} />
);

export const SearchIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="search" {...props} />
);

export const LibraryIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="library" {...props} />
);

export const MessageIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="message-circle" {...props} />
);

export const SettingsIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="settings" {...props} />
);

export const UserIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="user" {...props} />
);

export const TrendingIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="trending-up" {...props} />
);

export const StarIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="star" {...props} />
);

export const RadioIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="radio" {...props} />
);

export const RefreshIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="refresh" {...props} />
);

export const ShareIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="share" {...props} />
);

export const EyeIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="eye" {...props} />
);

export const EyeOffIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="eye-off" {...props} />
);

export const MailIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="mail" {...props} />
);

export const LockIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="lock" {...props} />
);

export const ArrowRightIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="arrow-right" {...props} />
);

export const PlusIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="plus" {...props} />
);

export const CloseIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="close" {...props} />
);

export const CheckIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="check" {...props} />
);

export const MoreIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="more" {...props} />
);

export const VolumeIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="volume" {...props} />
);

export const VolumeOffIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="volume-off" {...props} />
);

export const WifiIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="wifi" {...props} />
);

export const NotificationIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="notification" {...props} />
);

export const HelpIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="help" {...props} />
);

export const InfoIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="info" {...props} />
);

export const WarningIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="warning" {...props} />
);

export const ErrorIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="error" {...props} />
);

export const SuccessIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="success" {...props} />
);

export const SparklesIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="sparkles" {...props} />
);

export const GiftIcon = (props: Omit<IconProps, 'name'>) => (
  <IconSystem name="gift" {...props} />
);

export default IconSystem; 