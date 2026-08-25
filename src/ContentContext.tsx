import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { News, Event, Institution, Article, Slide, FeaturedModule, UserProfile } from './types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { mockSlides, mockFeaturedModules } from './data';

interface ContentContextType {
  news: News[];
  events: Event[];
  institutions: Institution[];
  articles: Article[];
  slides: Slide[];
  featuredModules: FeaturedModule[];
  user: UserProfile | null;
  loading: boolean;
  
  // CMS Operations
  addNews: (data: Omit<News, 'id' | 'createdAt'>) => Promise<void>;
  updateNews: (id: string, data: Partial<News>) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  
  addEvent: (data: Omit<Event, 'id' | 'createdAt'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  addInstitution: (data: Omit<Institution, 'id' | 'createdAt'>) => Promise<void>;
  updateInstitution: (id: string, data: Partial<Institution>) => Promise<void>;
  deleteInstitution: (id: string) => Promise<void>;
  
  addArticle: (data: Omit<Article, 'id' | 'createdAt'>) => Promise<void>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;

  addSlide: (data: Omit<Slide, 'id' | 'createdAt'>) => Promise<void>;
  updateSlide: (id: string, data: Partial<Slide>) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;

  addFeaturedModule: (data: Omit<FeaturedModule, 'id' | 'createdAt'>) => Promise<void>;
  updateFeaturedModule: (id: string, data: Partial<FeaturedModule>) => Promise<void>;
  deleteFeaturedModule: (id: string) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [featuredModules, setFeaturedModules] = useState<FeaturedModule[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Auth Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          // Default role for new users (or first admin check)
          const isFirstAdmin = firebaseUser.email === "epaz@e-paz.com.br" || firebaseUser.email === "admin@mep.org.br";
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            role: isFirstAdmin ? 'admin' : 'colaborador',
            photoURL: firebaseUser.photoURL
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Real-time Listeners ---
  useEffect(() => {
    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'news'));

    const qEvents = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'events'));

    const qInst = query(collection(db, 'institutions'), orderBy('createdAt', 'desc'));
    const unsubInst = onSnapshot(qInst, (snapshot) => {
      setInstitutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'institutions'));

    const qArticles = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubArticles = onSnapshot(qArticles, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'articles'));

    const qSlides = query(collection(db, 'slides'), orderBy('createdAt', 'desc'));
    const unsubSlides = onSnapshot(qSlides, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
      setSlides(data.length > 0 ? data : mockSlides);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'slides'));

    const qModules = query(collection(db, 'featuredModules'), orderBy('createdAt', 'desc'));
    const unsubModules = onSnapshot(qModules, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedModule));
      setFeaturedModules(data.length > 0 ? data : mockFeaturedModules);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'featuredModules'));

    return () => {
      unsubNews();
      unsubEvents();
      unsubInst();
      unsubArticles();
      unsubSlides();
      unsubModules();
    };
  }, []);

  // --- CMS Operations ---
  
  const addNews = async (data: Omit<News, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'news'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'news'); }
  };
  const updateNews = async (id: string, data: Partial<News>) => {
    try {
      await setDoc(doc(db, 'news', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `news/${id}`); }
  };
  const deleteNews = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'news', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `news/${id}`); }
  };

  const addEvent = async (data: Omit<Event, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'events'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'events'); }
  };
  const updateEvent = async (id: string, data: Partial<Event>) => {
    try {
      await setDoc(doc(db, 'events', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `events/${id}`); }
  };
  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `events/${id}`); }
  };

  const addInstitution = async (data: Omit<Institution, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'institutions'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'institutions'); }
  };
  const updateInstitution = async (id: string, data: Partial<Institution>) => {
    try {
      await setDoc(doc(db, 'institutions', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `institutions/${id}`); }
  };
  const deleteInstitution = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'institutions', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `institutions/${id}`); }
  };

  const addArticle = async (data: Omit<Article, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'articles'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'articles'); }
  };
  const updateArticle = async (id: string, data: Partial<Article>) => {
    try {
      await setDoc(doc(db, 'articles', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `articles/${id}`); }
  };
  const deleteArticle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'articles', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `articles/${id}`); }
  };

  const addSlide = async (data: Omit<Slide, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'slides'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'slides'); }
  };
  const updateSlide = async (id: string, data: Partial<Slide>) => {
    try {
      await setDoc(doc(db, 'slides', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `slides/${id}`); }
  };
  const deleteSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'slides', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `slides/${id}`); }
  };

  const addFeaturedModule = async (data: Omit<FeaturedModule, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'featuredModules'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'featuredModules'); }
  };
  const updateFeaturedModule = async (id: string, data: Partial<FeaturedModule>) => {
    try {
      await setDoc(doc(db, 'featuredModules', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `featuredModules/${id}`); }
  };
  const deleteFeaturedModule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featuredModules', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `featuredModules/${id}`); }
  };

  return (
    <ContentContext.Provider value={{ 
      news, events, institutions, articles, slides, featuredModules, user, loading,
      addNews, updateNews, deleteNews,
      addEvent, updateEvent, deleteEvent,
      addInstitution, updateInstitution, deleteInstitution,
      addArticle, updateArticle, deleteArticle,
      addSlide, updateSlide, deleteSlide,
      addFeaturedModule, updateFeaturedModule, deleteFeaturedModule
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};
