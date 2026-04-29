// Firestore Database Helper v4 - Firebase Admin SDK
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// Lazy-initialized Firestore instance
let _firestore: any = null;

const { FieldValue } = admin.firestore;

function getFirebaseApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'evaluation-b38b8';

  // Try service account file first
  try {
    const serviceAccountPath = path.join(process.cwd(), 'firebase', 'service-account.json');
    const serviceAccountJson = readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('[Firebase Admin] Initialized with service account file');
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } catch {
    console.warn('[Firebase Admin] Service account file not found, trying environment variable...');
  }

  // Try environment variable as JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env var');
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } catch {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT env var');
    }
  }

  throw new Error(
    '[Firebase Admin] No valid credentials found. Place service-account.json in /firebase/ or set FIREBASE_SERVICE_ACCOUNT env var.'
  );
}

export function getFirestoreInstance() {
  if (!_firestore) {
    _firestore = admin.firestore(getFirebaseApp());
  }
  return _firestore;
}

// Shorthand for admin.firestore.FieldFilter
const fieldWhere = admin.firestore.Filter;

// Helper to generate unique ID
export const generateId = () => {
  return admin.firestore().collection('_').doc().id;
};

// Helper for Timestamp
const now = () => admin.firestore.FieldValue.serverTimestamp();
const ts = admin.firestore.Timestamp;

// Sort helper
const sortByTimeDesc = (a: any, b: any, field = 'createdAt') => {
  const aTime = a[field]?.seconds || a[field]?.getTime?.() || 0;
  const bTime = b[field]?.seconds || b[field]?.getTime?.() || 0;
  return bTime - aTime;
};

// Firestore database helper
export const db = {
  // User operations
  user: {
    count: async ({ where }: { where?: any } = {}) => {
      let q = getFirestoreInstance().collection('users') as any;
      if (where?.role) q = q.where('role', '==', where.role);
      const snapshot = await q.get();
      return snapshot.size;
    },

    findFirst: async ({ where }: { where: { username?: string; role?: string; studentId?: string; id?: string } }) => {
      let q = getFirestoreInstance().collection('users') as any;
      if (where.username) q = q.where('username', '==', where.username);
      if (where.role) q = q.where('role', '==', where.role);
      if (where.studentId) q = q.where('studentId', '==', where.studentId);
      if (where.id) q = q.where('id', '==', where.id);
      const snapshot = await q.get();
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },

    findUnique: async ({ where }: { where: { id?: string; username?: string; studentId?: string } }) => {
      if (where.id) {
        const docSnap = await getFirestoreInstance().collection('users').doc(where.id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }

      let q = getFirestoreInstance().collection('users') as any;
      if (where.username) q = q.where('username', '==', where.username);
      if (where.studentId) q = q.where('studentId', '==', where.studentId);
      const snapshot = await q.get();
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },

    findMany: async ({ where, orderBy }: { where?: any; orderBy?: any } = {}) => {
      let q = getFirestoreInstance().collection('users') as any;
      if (where?.role) q = q.where('role', '==', where.role);
      const snapshot = await q.get();
      let users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      if (orderBy === 'createdAt_desc' || orderBy?.createdAt === 'desc') {
        users.sort((a: any, b: any) => sortByTimeDesc(a, b));
      }
      return users;
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isFirstLogin: data.isFirstLogin !== undefined ? data.isFirstLogin : true
      };
      await getFirestoreInstance().collection('users').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('users').doc(where.id).update({
        ...data,
        updatedAt: new Date()
      });
      const docSnap = await getFirestoreInstance().collection('users').doc(where.id).get();
      return { id: docSnap.id, ...docSnap.data() };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('users').doc(where.id).delete();
      return { success: true };
    }
  },

  // Faculty operations
  faculty: {
    count: async () => {
      const snapshot = await getFirestoreInstance().collection('faculty').get();
      return snapshot.size;
    },

    findMany: async () => {
      const snapshot = await getFirestoreInstance().collection('faculty').get();
      let faculty = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      faculty.sort((a: any, b: any) => sortByTimeDesc(a, b));
      return faculty;
    },

    findUnique: async ({ where }: { where: { id: string } }) => {
      const docSnap = await getFirestoreInstance().collection('faculty').doc(where.id).get();
      if (!docSnap.exists) return null;
      return { id: docSnap.id, ...docSnap.data() };
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      await getFirestoreInstance().collection('faculty').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('faculty').doc(where.id).update({
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('faculty').doc(where.id).delete();
      return { success: true };
    }
  },

  // Subject operations
  subject: {
    count: async () => {
      const snapshot = await getFirestoreInstance().collection('subjects').get();
      return snapshot.size;
    },

    findMany: async ({ where, include }: { where?: any; orderBy?: any; include?: any } = {}) => {
      let subjects = await db.subject._fetchAll();

      if (where?.id?.in) {
        subjects = subjects.filter((s: any) => where.id.in.includes(s.id));
      }
      if (where?.instructorId) {
        subjects = subjects.filter((s: any) => s.instructorId === where.instructorId);
      }

      if (include?.instructor) {
        for (const subject of subjects) {
          if (subject.instructorId) {
            subject.instructor = await db.faculty.findUnique({ where: { id: subject.instructorId } });
          }
        }
      }

      subjects.sort((a: any, b: any) => sortByTimeDesc(a, b));
      return subjects;
    },

    _fetchAll: async () => {
      const snapshot = await getFirestoreInstance().collection('subjects').get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    },

    findUnique: async ({ where }: { where: { id: string; code?: string } }) => {
      if (where.id) {
        const docSnap = await getFirestoreInstance().collection('subjects').doc(where.id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }

      if (where.code) {
        const snapshot = await getFirestoreInstance().collection('subjects').where('code', '==', where.code).get();
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
      }

      return null;
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      await getFirestoreInstance().collection('subjects').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('subjects').doc(where.id).update({
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('subjects').doc(where.id).delete();
      return { success: true };
    }
  },

  // Enrollment operations
  enrollment: {
    findMany: async ({ where, include }: { where?: any; include?: any; orderBy?: any } = {}) => {
      let q = getFirestoreInstance().collection('enrollments') as any;
      if (where?.studentId) q = q.where('studentId', '==', where.studentId);
      if (where?.status) q = q.where('status', '==', where.status);

      const snapshot = await q.get();
      let enrollments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      if (include?.student) {
        for (const enrollment of enrollments) {
          if (enrollment.studentId) {
            enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
          }
        }
      }

      enrollments.sort((a: any, b: any) => sortByTimeDesc(a, b));
      return enrollments;
    },

    findFirst: async ({ where, include }: { where: { studentId?: string; id?: string }; include?: any }) => {
      let q = getFirestoreInstance().collection('enrollments') as any;
      if (where.studentId) q = q.where('studentId', '==', where.studentId);

      const snapshot = await q.get();
      if (snapshot.empty) return null;

      const enrollment: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

      if (include?.student && enrollment.studentId) {
        enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
      }

      return enrollment;
    },

    findUnique: async ({ where, include }: { where: { id: string }; include?: any }) => {
      const docSnap = await getFirestoreInstance().collection('enrollments').doc(where.id).get();
      if (!docSnap.exists) return null;

      const enrollment: any = { id: docSnap.id, ...docSnap.data() };

      if (include?.student && enrollment.studentId) {
        enrollment.student = await db.user.findUnique({ where: { id: enrollment.studentId } });
      }

      return enrollment;
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      await getFirestoreInstance().collection('enrollments').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('enrollments').doc(where.id).update({
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('enrollments').doc(where.id).delete();
      return { success: true };
    },

    deleteMany: async ({ where }: { where: { studentId: string } }) => {
      let q = getFirestoreInstance().collection('enrollments') as any;
      if (where.studentId) q = q.where('studentId', '==', where.studentId);
      const snapshot = await q.get();

      const batch = getFirestoreInstance().batch();
      snapshot.docs.forEach((docSnap: any) => batch.delete(docSnap.ref));
      await batch.commit();

      return { count: snapshot.size };
    }
  },

  // Evaluation operations
  evaluation: {
    count: async ({ where }: { where?: any } = {}) => {
      let q = getFirestoreInstance().collection('evaluations') as any;
      if (where?.studentId) q = q.where('studentId', '==', where.studentId);
      if (where?.subjectId) q = q.where('subjectId', '==', where.subjectId);
      if (where?.facultyId) q = q.where('facultyId', '==', where.facultyId);
      const snapshot = await q.get();
      return snapshot.size;
    },

    findMany: async ({ where, take, include }: { where?: any; take?: number; orderBy?: any; include?: any } = {}) => {
      let q = getFirestoreInstance().collection('evaluations') as any;
      if (where?.studentId) q = q.where('studentId', '==', where.studentId);
      if (where?.subjectId) q = q.where('subjectId', '==', where.subjectId);
      if (where?.facultyId) q = q.where('facultyId', '==', where.facultyId);
      const snapshot = await q.get();

      let evaluations = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      evaluations.sort((a: any, b: any) => sortByTimeDesc(a, b, 'submittedAt'));

      if (take) evaluations = evaluations.slice(0, take);

      if (include) {
        for (const evaluation of evaluations) {
          if (include.student && evaluation.studentId) {
            evaluation.student = await db.user.findUnique({ where: { id: evaluation.studentId } });
          }
          if (include.subject && evaluation.subjectId) {
            evaluation.subject = await db.subject.findUnique({ where: { id: evaluation.subjectId } });
          }
          if (include.faculty && evaluation.facultyId) {
            evaluation.faculty = await db.faculty.findUnique({ where: { id: evaluation.facultyId } });
          }
        }
      }

      return evaluations;
    },

    findFirst: async ({ where }: { where: { studentId?: string; subjectId?: string } }) => {
      let q = getFirestoreInstance().collection('evaluations') as any;
      if (where.studentId) q = q.where('studentId', '==', where.studentId);
      if (where.subjectId) q = q.where('subjectId', '==', where.subjectId);
      const snapshot = await q.get();
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, submittedAt: new Date() };
      await getFirestoreInstance().collection('evaluations').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('evaluations').doc(where.id).update(data);
      return { success: true };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('evaluations').doc(where.id).delete();
      return { success: true };
    },

    deleteMany: async ({ where }: { where: { studentId?: string; subjectId?: string; facultyId?: string } }) => {
      let q = getFirestoreInstance().collection('evaluations') as any;
      if (where.studentId) q = q.where('studentId', '==', where.studentId);
      if (where.subjectId) q = q.where('subjectId', '==', where.subjectId);
      if (where.facultyId) q = q.where('facultyId', '==', where.facultyId);
      const snapshot = await q.get();

      const batch = getFirestoreInstance().batch();
      snapshot.docs.forEach((docSnap: any) => batch.delete(docSnap.ref));
      await batch.commit();

      return { count: snapshot.size };
    }
  },

  // PreRegisteredStudent operations
  preRegisteredStudent: {
    findMany: async ({ where }: { where?: any } = {}) => {
      let q = getFirestoreInstance().collection('preRegisteredStudents') as any;
      if (where?.registered !== undefined) q = q.where('registered', '==', where.registered);

      const snapshot = await q.get();
      let students = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      students.sort((a: any, b: any) => sortByTimeDesc(a, b));
      return students;
    },

    findUnique: async ({ where }: { where: { id?: string; studentId?: string } }) => {
      if (where.id) {
        const docSnap = await getFirestoreInstance().collection('preRegisteredStudents').doc(where.id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
      }

      if (where.studentId) {
        const snapshot = await getFirestoreInstance().collection('preRegisteredStudents').where('studentId', '==', where.studentId).get();
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
      }

      return null;
    },

    findFirst: async ({ where }: { where: { studentId?: string; id?: string; NOT?: any } }) => {
      let q = getFirestoreInstance().collection('preRegisteredStudents') as any;
      if (where.studentId) q = q.where('studentId', '==', where.studentId);

      const snapshot = await q.get();
      if (snapshot.empty) return null;

      // Handle NOT clause in memory
      if (where.NOT?.id) {
        for (const doc of snapshot.docs) {
          if (doc.id !== where.NOT.id) {
            return { id: doc.id, ...doc.data() };
          }
        }
        return null;
      }

      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      await getFirestoreInstance().collection('preRegisteredStudents').doc(id).set(docData);
      return docData;
    },

    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      await getFirestoreInstance().collection('preRegisteredStudents').doc(where.id).update({
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    },

    delete: async ({ where }: { where: { id: string } }) => {
      await getFirestoreInstance().collection('preRegisteredStudents').doc(where.id).delete();
      return { success: true };
    },

    updateMany: async ({ where, data }: { where: { userId?: string }; data: any }) => {
      let q = getFirestoreInstance().collection('preRegisteredStudents') as any;
      if (where.userId) q = q.where('userId', '==', where.userId);
      const snapshot = await q.get();

      const batch = getFirestoreInstance().batch();
      snapshot.docs.forEach((docSnap: any) => {
        batch.update(docSnap.ref, { ...data, updatedAt: new Date() });
      });
      await batch.commit();

      return { count: snapshot.size };
    }
  },

  // Settings operations
  settings: {
    findFirst: async () => {
      const snapshot = await getFirestoreInstance().collection('settings').get();
      if (snapshot.empty) {
        const id = generateId();
        const defaultSettings = {
          id,
          evaluationOpen: true,
          currentSemester: '1st Semester',
          currentSchoolYear: '2024-2025',
          updatedAt: new Date()
        };
        await getFirestoreInstance().collection('settings').doc(id).set(defaultSettings);
        return defaultSettings;
      }
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    },

    update: async ({ where, data }: { where?: { id: string }; data: any }) => {
      let settingsId = where?.id;
      if (!settingsId) {
        const settings = await db.settings.findFirst();
        settingsId = settings.id;
      }
      await getFirestoreInstance().collection('settings').doc(settingsId).update({
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    },

    create: async ({ data }: { data: any }) => {
      const id = generateId();
      const docData = { ...data, id, updatedAt: new Date() };
      await getFirestoreInstance().collection('settings').doc(id).set(docData);
      return docData;
    }
  }
};
