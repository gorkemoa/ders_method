// Firebase konfigürasyonu
// Bu dosyayı Firebase Console'dan aldığınız konfigürasyon bilgileriyle güncelleyin

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase konfigürasyonu - YKS Deneme Takip Sistemi
const firebaseConfig = {
    apiKey: "AIzaSyCOkName_JKLapzfFsr3gxqKdNgTszwPf8",
    authDomain: "yks-deneme-takip-2024.firebaseapp.com",
    projectId: "yks-deneme-takip-2024",
    storageBucket: "yks-deneme-takip-2024.firebasestorage.app",
    messagingSenderId: "516696865990",
    appId: "1:516696865990:web:b5dbd6250902788415abc7"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firebase servislerini al
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth fonksiyonları
export const signIn = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
    return signOut(auth);
};

export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Firestore fonksiyonları
export const addExam = async (examData) => {
    try {
        const docRef = await addDoc(collection(db, 'exams'), {
            ...examData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return docRef.id;
    } catch (error) {
        console.error('Deneme ekleme hatası:', error);
        throw error;
    }
};

export const getExams = async (userId) => {
    try {
        const q = query(
            collection(db, 'exams'),
            where('userId', '==', userId),
            orderBy('examDate', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const exams = [];
        querySnapshot.forEach((doc) => {
            exams.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return exams;
    } catch (error) {
        console.error('Denemeleri getirme hatası:', error);
        throw error;
    }
};

export const updateExam = async (examId, examData) => {
    try {
        const examRef = doc(db, 'exams', examId);
        await updateDoc(examRef, {
            ...examData,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Deneme güncelleme hatası:', error);
        throw error;
    }
};

export const deleteExam = async (examId) => {
    try {
        await deleteDoc(doc(db, 'exams', examId));
    } catch (error) {
        console.error('Deneme silme hatası:', error);
        throw error;
    }
};

// Kullanıcı bilgilerini al
export const getCurrentUser = () => {
    return auth.currentUser;
};

// Firebase bağlantı durumunu kontrol et
export const checkFirebaseConnection = async () => {
    try {
        // Basit bir test sorgusu
        const testQuery = query(collection(db, 'exams'));
        await getDocs(testQuery);
        return true;
    } catch (error) {
        console.error('Firebase bağlantı hatası:', error);
        return false;
    }
};
