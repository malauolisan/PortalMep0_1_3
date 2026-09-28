import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { News, Event, Institution, Article, Slide, FeaturedModule, UserProfile } from './types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { mockEvents, mockSlides, mockFeaturedModules } from './data';

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
  restoreDefaultEvents: () => Promise<void>;
  
  addInstitution: (data: Omit<Institution, 'id' | 'createdAt'>) => Promise<void>;
  updateInstitution: (id: string, data: Partial<Institution>) => Promise<void>;
  deleteInstitution: (id: string) => Promise<void>;
  
  addArticle: (data: Omit<Article, 'id' | 'createdAt'>) => Promise<void>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;

  addSlide: (data: Omit<Slide, 'id' | 'createdAt'>) => Promise<void>;
  updateSlide: (id: string, data: Partial<Slide>) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  restoreDefaultSlides: () => Promise<void>;

  addFeaturedModule: (data: Omit<FeaturedModule, 'id' | 'createdAt'>) => Promise<void>;
  updateFeaturedModule: (id: string, data: Partial<FeaturedModule>) => Promise<void>;
  deleteFeaturedModule: (id: string) => Promise<void>;
  restoreDefaultFeaturedModules: () => Promise<void>;
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
        const isMasterAdmin = firebaseUser.email === "epaz@e-paz.com.br" || firebaseUser.email === "admin@mep.org.br";
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const role = isMasterAdmin ? 'admin' : (data.role || 'colaborador');
          if (isMasterAdmin && data.role !== 'admin') {
            await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true });
          }
          setUser({ uid: firebaseUser.uid, ...data, role } as UserProfile);
        } else {
          // Default role for new users (or first admin check)
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            role: isMasterAdmin ? 'admin' : 'colaborador',
            photoURL: firebaseUser.photoURL
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }

        // Auto-heal/seed featuredModules and slides in Firestore if needed
        try {
          // Check and heal featuredModules in Firestore
          for (let i = 0; i < mockFeaturedModules.length; i++) {
            const m = mockFeaturedModules[i];
            const mRef = doc(db, 'featuredModules', m.id);
            const mSnap = await getDoc(mRef);
            if (!mSnap.exists()) {
              await setDoc(mRef, {
                title: m.title,
                desc: m.desc,
                img: m.img,
                color: m.color,
                link: m.link,
                order: m.order || (i + 1),
                createdAt: new Date(Date.now() - (mockFeaturedModules.length - i) * 60000).toISOString()
              });
            } else {
              const d = mSnap.data();
              const needsUpdate = !d.createdAt || d.order === undefined;
              if (needsUpdate) {
                await setDoc(mRef, {
                  createdAt: d.createdAt || d.updatedAt || new Date(Date.now() - (mockFeaturedModules.length - i) * 60000).toISOString(),
                  order: d.order !== undefined ? d.order : (m.order || (i + 1))
                }, { merge: true });
              }
            }
          }

          // Check and heal slides in Firestore
          for (let i = 0; i < mockSlides.length; i++) {
            const s = mockSlides[i];
            const sRef = doc(db, 'slides', s.id);
            const sSnap = await getDoc(sRef);
            if (!sSnap.exists()) {
              await setDoc(sRef, {
                title: s.title,
                subtitle: s.subtitle,
                image: s.image,
                link: s.link,
                createdAt: new Date(Date.now() - (mockSlides.length - i) * 60000).toISOString()
              });
            } else {
              const d = sSnap.data();
              if (!d.createdAt) {
                await setDoc(sRef, {
                  createdAt: d.updatedAt || new Date(Date.now() - (mockSlides.length - i) * 60000).toISOString()
                }, { merge: true });
              }
            }
          }

          // Check and initialize events in Firestore if needed
          const eventsInitRef = doc(db, 'events', '_initialized');
          const eventsInitSnap = await getDoc(eventsInitRef);
          if (!eventsInitSnap.exists()) {
            for (let i = 0; i < mockEvents.length; i++) {
              const ev = mockEvents[i];
              const evRef = doc(db, 'events', ev.id);
              const evSnap = await getDoc(evRef);
              if (!evSnap.exists()) {
                await setDoc(evRef, {
                  title: ev.title,
                  subtitle: (ev as any).subtitle || '',
                  description: ev.description || '',
                  author: (ev as any).author || 'Equipe MEP',
                  date: ev.date || '',
                  time: ev.time || '',
                  location: ev.location || '',
                  image: ev.image || '',
                  createdAt: new Date(Date.now() - (mockEvents.length - i) * 60000).toISOString()
                });
              }
            }
            await setDoc(eventsInitRef, { initialized: true, seededAt: new Date().toISOString() });
          }
        } catch (healErr) {
          console.warn('[ContentContext] Auto-healing check completed with note:', healErr);
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

    // Retrieve all events without restrictive orderBy so all documents are always visible, editable, and deletable
    const qEvents = collection(db, 'events');
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs
        .filter(d => d.id !== '_initialized')
        .map(d => {
          const item = d.data();
          return {
            id: d.id,
            ...item,
            createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
          } as Event;
        });
      data.sort((a, b) => {
        const timeB = b.createdAt || b.updatedAt || '';
        const timeA = a.createdAt || a.updatedAt || '';
        return timeB.localeCompare(timeA);
      });
      setEvents(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'events'));

    const qInst = query(collection(db, 'institutions'), orderBy('createdAt', 'desc'));
    const unsubInst = onSnapshot(qInst, (snapshot) => {
      setInstitutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'institutions'));

    const qArticles = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubArticles = onSnapshot(qArticles, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'articles'));

    // Retrieve all slides without restrictive orderBy to guarantee documents without createdAt are never omitted
    const qSlides = collection(db, 'slides');
    const unsubSlides = onSnapshot(qSlides, (snapshot) => {
      const data = snapshot.docs.map(d => {
        const item = d.data();
        return {
          id: d.id,
          ...item,
          createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
        } as unknown as Slide;
      });
      data.sort((a, b) => {
        const timeB = b.createdAt || b.updatedAt || '';
        const timeA = a.createdAt || a.updatedAt || '';
        return timeB.localeCompare(timeA);
      });
      setSlides(data.length > 0 ? data : mockSlides);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'slides'));

    // Retrieve all featured modules without restrictive orderBy so all documents are always visible and editable
    const qModules = collection(db, 'featuredModules');
    const unsubModules = onSnapshot(qModules, (snapshot) => {
      const data = snapshot.docs.map(d => {
        const item = d.data();
        return {
          id: d.id,
          ...item,
          createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
        } as FeaturedModule;
      });
      data.sort((a, b) => {
        const timeB = b.createdAt || b.updatedAt || '';
        const timeA = a.createdAt || a.updatedAt || '';
        return timeB.localeCompare(timeA);
      });
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
      const now = new Date().toISOString();
      const existing = events.find(e => e.id === id);
      const createdAt = existing?.createdAt || data.createdAt || now;
      await setDoc(doc(db, 'events', id), { ...data, createdAt, updatedAt: now }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `events/${id}`); }
  };
  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `events/${id}`); }
  };
  const restoreDefaultEvents = async () => {
    try {
      for (let i = 0; i < mockEvents.length; i++) {
        const ev = mockEvents[i];
        await setDoc(doc(db, 'events', ev.id), {
          title: ev.title,
          subtitle: (ev as any).subtitle || '',
          description: ev.description || '',
          author: (ev as any).author || 'Equipe MEP',
          date: ev.date || '',
          time: ev.time || '',
          location: ev.location || '',
          image: ev.image || '',
          createdAt: new Date(Date.now() - (mockEvents.length - i) * 60000).toISOString()
        });
      }
      const eventsInitRef = doc(db, 'events', '_initialized');
      await setDoc(eventsInitRef, { initialized: true, restoredAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'events'); }
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
      const now = new Date().toISOString();
      const existing = slides.find(s => s.id === id);
      const createdAt = existing?.createdAt || data.createdAt || now;
      await setDoc(doc(db, 'slides', id), { ...data, createdAt, updatedAt: now }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `slides/${id}`); }
  };
  const deleteSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'slides', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `slides/${id}`); }
  };
  const restoreDefaultSlides = async () => {
    try {
      for (let i = 0; i < mockSlides.length; i++) {
        const s = mockSlides[i];
        await setDoc(doc(db, 'slides', s.id), {
          title: s.title,
          subtitle: s.subtitle,
          image: s.image,
          link: s.link,
          createdAt: new Date(Date.now() - (mockSlides.length - i) * 60000).toISOString()
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'slides'); }
  };

  const addFeaturedModule = async (data: Omit<FeaturedModule, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'featuredModules'), { ...data, createdAt: new Date().toISOString() });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'featuredModules'); }
  };
  const updateFeaturedModule = async (id: string, data: Partial<FeaturedModule>) => {
    try {
      const now = new Date().toISOString();
      const existing = featuredModules.find(m => m.id === id);
      const createdAt = existing?.createdAt || data.createdAt || now;
      await setDoc(doc(db, 'featuredModules', id), { ...data, createdAt, updatedAt: now }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `featuredModules/${id}`); }
  };
  const deleteFeaturedModule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featuredModules', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `featuredModules/${id}`); }
  };
  const restoreDefaultFeaturedModules = async () => {
    try {
      for (let i = 0; i < mockFeaturedModules.length; i++) {
        const m = mockFeaturedModules[i];
        await setDoc(doc(db, 'featuredModules', m.id), {
          title: m.title,
          desc: m.desc,
          img: m.img,
          color: m.color,
          link: m.link,
          createdAt: new Date(Date.now() - (mockFeaturedModules.length - i) * 60000).toISOString()
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'featuredModules'); }
  };

  return (
    <ContentContext.Provider value={{ 
      news, events, institutions, articles, slides, featuredModules, user, loading,
      addNews, updateNews, deleteNews,
      addEvent, updateEvent, deleteEvent, restoreDefaultEvents,
      addInstitution, updateInstitution, deleteInstitution,
      addArticle, updateArticle, deleteArticle,
      addSlide, updateSlide, deleteSlide, restoreDefaultSlides,
      addFeaturedModule, updateFeaturedModule, deleteFeaturedModule, restoreDefaultFeaturedModules
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
