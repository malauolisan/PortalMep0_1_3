export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: 'admin' | 'colaborador';
  photoURL: string | null;
}

export interface News {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  author: string;
  authorId: string;
  content: string;
  summary: string;
  image: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  date: string; // Format: "DD MMM"
  time: string;
  location: string;
  image: string;
  description: string;
  createdAt: string;
}

export interface Institution {
  id: string;
  name?: string;
  description?: string;
  email?: string;
  website?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  image?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorId: string;
  date: string;
  content: string;
  image?: string;
  createdAt: string;
}

export interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  link?: string;
}

export interface FeaturedModule {
  id: string;
  title: string;
  desc: string;
  img: string;
  color: string;
  link: string;
}
