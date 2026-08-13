import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  LabProfile,
  LabTestCatalogItem,
  LabOrder,
  LabOrderStatus,
  LabSample,
  LabSampleStatus,
  LabTestResult,
  LabTestResultItem,
  ResultPublishStatus,
  LabStaffMember,
  LabTransaction,
  LabFinanceType,
  LabAuditLog,
  CollectionMethod
} from "../types";
import { normalizePhoneNumber } from "./firebaseService";

function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Recursively strips `undefined` fields from plain objects and arrays before writing to Firestore.
 * Preserves Firebase special types (Timestamp, FieldValue/serverTimestamp, DocumentReference, GeoPoint, Date, etc.) without mutating them.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!isPlainObject(obj)) return obj;
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Skip undefined fields completely so Firestore doesn't throw
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        isPlainObject(item) ? sanitizeFirestoreData(item) : item
      );
    } else if (isPlainObject(value)) {
      sanitized[key] = sanitizeFirestoreData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Default standard tests seed for new laboratories
export const DEFAULT_LAB_TESTS_SEED: Omit<LabTestCatalogItem, 'id' | 'labId' | 'createdAt'>[] = [
  {
    name: "صورة دم كاملة (CBC)",
    category: "أمراض الدم",
    price: 180,
    estimatedTurnaroundHours: 12,
    sampleType: "دم وريدي (EDTA)",
    requiresFasting: false,
    patientInstructions: "لا يتطلب صيام سابق. يمكن إجراء الفحص في أي وقت.",
    description: "فحص شامل لكريات الدم الحمراء، البيضاء، الهيموجلوبين وصفائح الدم.",
    active: true
  },
  {
    name: "سكر صائم (FBG)",
    category: "كيمياء الدم",
    price: 90,
    estimatedTurnaroundHours: 6,
    sampleType: "دم وريدي",
    requiresFasting: true,
    fastingHours: 8,
    patientInstructions: "يلزم الصيام التام عن الطعام والشراب لمدة 8-10 ساعات (يسمح بالماء فقط).",
    description: "قياس مستوى الجلوكوز في الدم بعد الصيام.",
    active: true
  },
  {
    name: "السكر التراكمي (HbA1c)",
    category: "كيمياء الدم",
    price: 190,
    estimatedTurnaroundHours: 12,
    sampleType: "دم وريدي",
    requiresFasting: false,
    patientInstructions: "لا يتطلب صيام. يوضح متوسط السكر خلال الـ 3 أشهر الماضية.",
    description: "مقياس دقيق لمعدل السكر في الدم خلال 90 يوماً.",
    active: true
  },
  {
    name: "وظائف كبد كاملة (Liver Function Tests)",
    category: "كيمياء الدم",
    price: 320,
    estimatedTurnaroundHours: 24,
    sampleType: "دم وريدي",
    requiresFasting: true,
    fastingHours: 8,
    patientInstructions: "يفضل الصيام 8 ساعات وتجنب الأدوية الثقيلة قبل الفحص.",
    description: "يشمل ALT, AST, Bilirubin, Albumin, Alkaline Phosphatase.",
    active: true
  },
  {
    name: "وظائف كلى (Kidney Function Tests)",
    category: "كيمياء الدم",
    price: 240,
    estimatedTurnaroundHours: 12,
    sampleType: "دم وريدي",
    requiresFasting: false,
    patientInstructions: "ينصح بشرب كمية كافية من الماء قبل سحب العينة.",
    description: "يشمل اليوريا (Urea)، الكرياتينين (Creatinine)، وحامض اليوريك (Uric Acid).",
    active: true
  },
  {
    name: "دهون كاملة (Lipid Profile)",
    category: "كيمياء الدم",
    price: 280,
    estimatedTurnaroundHours: 12,
    sampleType: "دم وريدي",
    requiresFasting: true,
    fastingHours: 12,
    patientInstructions: "الصيام التام من 12 إلى 14 ساعة (يسمح بالماء فقط).",
    description: "الكوليسترول الكلي، الدهون الثلاثية، الكوليسترول الضار والنافع.",
    active: true
  },
  {
    name: "هرمون الغدة الدرقية (TSH)",
    category: "الهرمونات",
    price: 210,
    estimatedTurnaroundHours: 24,
    sampleType: "دم وريدي",
    requiresFasting: false,
    patientInstructions: "يفضل سحب العينة صباحاً قبل تناول أدوية الغدة.",
    description: "قياس الهرمون المنبه للغدة الدرقية من الغدة النخامية.",
    active: true
  },
  {
    name: "فيتامين د (Vitamin D - 25 OH)",
    category: "المناعة والفيتايمينات",
    price: 450,
    estimatedTurnaroundHours: 24,
    sampleType: "دم وريدي",
    requiresFasting: false,
    patientInstructions: "لا يتطلب صيام خاص.",
    description: "فحص قياس نسبة فيتامين د الكلي في الجسم.",
    active: true
  },
  {
    name: "تحليل بول كامل (Urine Analysis)",
    category: "الفحوصات العامة",
    price: 80,
    estimatedTurnaroundHours: 6,
    sampleType: "عينة بول",
    requiresFasting: false,
    patientInstructions: "تجميع أول عينة بول صباحية في وعاء معقم بعد غسل المنطقة جيداً.",
    description: "فحص الخواص الفيزيائية والكيميائية والميكروسكوبية للبول.",
    active: true
  },
  {
    name: "تحليل براز كامل (Stool Analysis)",
    category: "الفحوصات العامة",
    price: 90,
    estimatedTurnaroundHours: 6,
    sampleType: "عينة براز",
    requiresFasting: false,
    patientInstructions: "إحضار العينة في وعاء معقم في أقرب وقت بعد إخراجها.",
    description: "فحص للطفيليات، البكتيريا، والدم الخفي بالبراز.",
    active: true
  }
];

// ============================================================================
// LAB PROFILE FUNCTIONS
// ============================================================================

export async function createLabProfile(
  uid: string,
  name: string,
  responsibleName: string,
  phone: string,
  address: string,
  email?: string
): Promise<LabProfile> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const now = new Date().toISOString();

  const newLab: LabProfile = {
    uid,
    accountType: 'laboratory',
    name: name || "معمل التحاليل الطبية",
    responsibleName: responsibleName || "مدير المعمل",
    phone: normalizedPhone,
    whatsappNumber: normalizedPhone,
    email: email ? email.trim().toLowerCase() : "",
    address: address || "القاهرة، مصر",
    governorate: "القاهرة",
    district: "وسط البلد",
    description: "معمل تحاليل طبية مجهز بأحدث الأجهزة المعتمدة لتقديم أدق النتائج في أسرع وقت.",
    services: ["تحاليل كيمياء الدم", "صورة الدم الكاملة", "الهرمونات والفيتامينات", "سحب عينات منزلية"],
    workHours: {
      open: "08:00",
      close: "23:00",
      workingDays: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    },
    offersHomeCollection: true,
    homeCollectionFee: 100,
    homeCollectionNotes: "خدمة سحب العينات بالمنزل متوفرة يومياً بأعلى معايير التعقيم والتبريد.",
    createdAt: now,
    isActive: true
  };

  // 1. Instantly save main Lab profile document
  await setDoc(doc(db, "labs", uid), sanitizeFirestoreData(newLab), { merge: true });

  // 2. Seed default test catalog for this lab in background non-blocking task
  seedDefaultCatalogIfEmpty(uid).catch((err) => {
    console.error("Background seed error for lab catalog:", err);
  });

  return newLab;
}

export async function getLabProfile(labId: string): Promise<LabProfile | null> {
  if (!labId) return null;
  try {
    const snap = await getDoc(doc(db, "labs", labId));
    if (snap.exists()) {
      return snap.data() as LabProfile;
    }
  } catch (err) {
    console.error("Error fetching lab profile:", err);
  }
  return null;
}

export async function updateLabProfile(
  labId: string,
  updates: Partial<LabProfile>
): Promise<void> {
  if (!labId) return;
  const ref = doc(db, "labs", labId);
  await updateDoc(ref, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  }));
}

export async function getAllLabs(): Promise<LabProfile[]> {
  try {
    const snap = await getDocs(collection(db, "labs"));
    const list: LabProfile[] = [];
    snap.forEach((d) => {
      const data = d.data() as LabProfile;
      if (!data.isDeleted) {
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error getting labs:", err);
    return [];
  }
}

// ============================================================================
// TEST CATALOG FUNCTIONS
// ============================================================================

export async function seedDefaultCatalogIfEmpty(labId: string): Promise<void> {
  try {
    const q = query(collection(db, "labs", labId, "catalog"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return; // Catalog already initialized

    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const testData of DEFAULT_LAB_TESTS_SEED) {
      const ref = doc(collection(db, "labs", labId, "catalog"));
      const newTestItem: LabTestCatalogItem = {
        ...testData,
        id: ref.id,
        labId,
        createdAt: nowIso
      };
      batch.set(ref, sanitizeFirestoreData(newTestItem));
    }

    await batch.commit();
  } catch (err) {
    console.error("Error seeding lab catalog:", err);
  }
}

export async function getLabTests(labId: string, onlyActive = false): Promise<LabTestCatalogItem[]> {
  if (!labId) return [];
  try {
    const catRef = collection(db, "labs", labId, "catalog");
    const q = onlyActive
      ? query(catRef, where("active", "==", true))
      : query(catRef);
    const snap = await getDocs(q);
    const tests: LabTestCatalogItem[] = [];
    snap.forEach((d) => {
      tests.push(d.data() as LabTestCatalogItem);
    });
    return tests;
  } catch (err) {
    console.error("Error fetching lab tests:", err);
    return [];
  }
}

export async function addLabTest(
  labId: string,
  test: Omit<LabTestCatalogItem, 'id' | 'labId' | 'createdAt'>
): Promise<LabTestCatalogItem> {
  const ref = doc(collection(db, "labs", labId, "catalog"));
  const item: LabTestCatalogItem = {
    ...test,
    id: ref.id,
    labId,
    createdAt: new Date().toISOString()
  };
  await setDoc(ref, sanitizeFirestoreData(item));
  return item;
}

export async function updateLabTest(
  labId: string,
  testId: string,
  updates: Partial<LabTestCatalogItem>
): Promise<void> {
  const ref = doc(db, "labs", labId, "catalog", testId);
  await updateDoc(ref, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  }));
}

export async function deleteLabTest(labId: string, testId: string): Promise<void> {
  await deleteDoc(doc(db, "labs", labId, "catalog", testId));
}

// ============================================================================
// ORDER MANAGEMENT FUNCTIONS
// ============================================================================

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${randomDigits}`;
}

export function generateSampleBarcode(): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `LAB-${year}-${randomDigits}`;
}

export async function createLabOrder(orderData: {
  labId: string;
  labName: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: 'male' | 'female';
  patientNotes?: string;
  collectionMethod: CollectionMethod;
  homeAddress?: string;
  homePreferredDate?: string;
  homePreferredTime?: string;
  testIds: string[];
  testNames: string[];
  totalPrice: number;
  paidAmount?: number;
}): Promise<LabOrder> {
  const normalizedPhone = normalizePhoneNumber(orderData.patientPhone || "");
  const ref = doc(collection(db, "labs", orderData.labId, "orders"));
  const orderNum = generateOrderNumber();
  const now = new Date().toISOString();

  // Clean and normalize all inputs before creating the order object
  const cleanLabName = (orderData.labName || "").trim() || "المعمل الطبي";
  const cleanPatientName = (orderData.patientName || "").trim() || "مريض بدون اسم";
  const cleanPatientNotes = (orderData.patientNotes || "").trim();
  const cleanHomeAddress = (orderData.homeAddress || "").trim();
  const cleanHomeDate = (orderData.homePreferredDate || "").trim();
  const cleanHomeTime = (orderData.homePreferredTime || "").trim();
  const cleanTestIds = Array.isArray(orderData.testIds) ? orderData.testIds : [];
  const cleanTestNames = Array.isArray(orderData.testNames) ? orderData.testNames : [];
  const cleanTotalPrice = typeof orderData.totalPrice === 'number' && !isNaN(orderData.totalPrice) ? orderData.totalPrice : 0;
  const cleanPaidAmount = typeof orderData.paidAmount === 'number' && !isNaN(orderData.paidAmount) ? orderData.paidAmount : 0;

  const newOrder: LabOrder = {
    id: ref.id,
    labId: orderData.labId || "",
    labName: cleanLabName,
    orderNumber: orderNum,
    patientName: cleanPatientName,
    patientPhone: normalizedPhone,
    patientAge: typeof orderData.patientAge === 'number' && !isNaN(orderData.patientAge) ? orderData.patientAge : 0,
    patientGender: orderData.patientGender || 'male',
    patientNotes: cleanPatientNotes,
    collectionMethod: orderData.collectionMethod || 'IN_LAB',
    homeAddress: cleanHomeAddress,
    homePreferredDate: cleanHomeDate,
    homePreferredTime: cleanHomeTime,
    testIds: cleanTestIds,
    testNames: cleanTestNames,
    totalPrice: cleanTotalPrice,
    paidAmount: cleanPaidAmount,
    status: 'NEW',
    createdAt: now,
    updatedAt: now
  };

  await setDoc(ref, sanitizeFirestoreData(newOrder));

  // Auto-generate initial sample document for barcode scanning & tracking
  const sampleRef = doc(collection(db, "labs", orderData.labId, "samples"));
  const sampleBarcode = generateSampleBarcode();
  const sampleItem: LabSample = {
    id: sampleRef.id,
    sampleId: sampleBarcode,
    labId: orderData.labId || "",
    orderId: ref.id,
    orderNumber: orderNum,
    patientName: cleanPatientName,
    patientPhone: normalizedPhone,
    testNames: cleanTestNames,
    sampleType: "عينات متعددة",
    status: "pending",
    createdAt: now
  };
  await setDoc(sampleRef, sanitizeFirestoreData(sampleItem));

  return newOrder;
}

export async function getLabOrders(labId: string): Promise<LabOrder[]> {
  if (!labId) return [];
  try {
    const ordersRef = collection(db, "labs", labId, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"), limit(100));
    const snap = await getDocs(q);
    const list: LabOrder[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabOrder);
    });
    return list;
  } catch (err) {
    // Fallback if orderBy without index
    try {
      const snap = await getDocs(query(collection(db, "labs", labId, "orders"), limit(100)));
      const list: LabOrder[] = [];
      snap.forEach((d) => list.push(d.data() as LabOrder));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (fallbackErr) {
      console.error("Error fetching lab orders:", fallbackErr);
      return [];
    }
  }
}

export async function getLabOrderById(labId: string, orderId: string): Promise<LabOrder | null> {
  if (!labId || !orderId) return null;
  try {
    const snap = await getDoc(doc(db, "labs", labId, "orders", orderId));
    if (snap.exists()) {
      return snap.data() as LabOrder;
    }
  } catch (err) {
    console.error("Error fetching lab order:", err);
  }
  return null;
}

export async function updateLabOrderStatus(
  labId: string,
  orderId: string,
  status: LabOrderStatus
): Promise<void> {
  const ref = doc(db, "labs", labId, "orders", orderId);
  await updateDoc(ref, sanitizeFirestoreData({
    status,
    updatedAt: new Date().toISOString()
  }));
}

// Subscribe to Realtime orders update
export function subscribeToLabOrders(
  labId: string,
  callback: (orders: LabOrder[]) => void
): () => void {
  if (!labId) return () => {};
  const ordersRef = collection(db, "labs", labId, "orders");
  const q = query(ordersRef, orderBy("createdAt", "desc"), limit(100));
  
  let unsubFallback: (() => void) | null = null;
  const unsubMain = onSnapshot(q, (snap) => {
    const list: LabOrder[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabOrder);
    });
    callback(list);
  }, (err) => {
    // Fallback if index missing
    console.warn("Lab orders index missing, falling back to un-ordered query:", err);
    const fallbackQ = query(ordersRef, limit(100));
    unsubFallback = onSnapshot(fallbackQ, (snap) => {
      const list: LabOrder[] = [];
      snap.forEach((d) => {
        list.push(d.data() as LabOrder);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    });
  });

  return () => {
    unsubMain();
    if (unsubFallback) unsubFallback();
  };
}

// ============================================================================
// SAMPLE MANAGEMENT & BARCODE FUNCTIONS
// ============================================================================

export async function getLabSamples(labId: string): Promise<LabSample[]> {
  if (!labId) return [];
  try {
    const samplesRef = collection(db, "labs", labId, "samples");
    const q = query(samplesRef, limit(100));
    const snap = await getDocs(q);
    const list: LabSample[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabSample);
    });
    return list;
  } catch (err) {
    console.error("Error fetching samples:", err);
    return [];
  }
}

export async function getSampleByBarcode(labId: string, barcode: string): Promise<LabSample | null> {
  if (!labId || !barcode) return null;
  try {
    const q = query(
      collection(db, "labs", labId, "samples"),
      where("sampleId", "==", barcode.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as LabSample;
    }
  } catch (err) {
    console.error("Error searching sample barcode:", err);
  }
  return null;
}

export async function updateSampleStatus(
  labId: string,
  sampleIdDoc: string,
  status: LabSampleStatus
): Promise<void> {
  const ref = doc(db, "labs", labId, "samples", sampleIdDoc);
  const now = new Date().toISOString();
  const updates: Partial<LabSample> = { status };
  if (status === 'received') updates.receivedAt = now;
  if (status === 'completed') updates.status = 'completed';

  await updateDoc(ref, sanitizeFirestoreData(updates));
}

// ============================================================================
// RESULT ENTRY & PUBLISH FUNCTIONS
// ============================================================================

export async function saveTestResult(
  labId: string,
  resultData: Omit<LabTestResult, 'id' | 'createdAt'>
): Promise<LabTestResult> {
  const ref = doc(collection(db, "labs", labId, "results"));
  const now = new Date().toISOString();

  const newResult: LabTestResult = {
    ...resultData,
    id: ref.id,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(ref, sanitizeFirestoreData(newResult));
  return newResult;
}

export async function approveAndPublishResult(
  labId: string,
  resultId: string,
  reviewerUid: string,
  reviewerName: string,
  generalNotes?: string
): Promise<void> {
  const now = new Date().toISOString();
  const ref = doc(db, "labs", labId, "results", resultId);
  await updateDoc(ref, sanitizeFirestoreData({
    status: "published",
    reviewerUid,
    reviewerName,
    generalNotes: generalNotes || "",
    approvedAt: now,
    updatedAt: now
  }));
}

export async function getLabResultsForOrder(labId: string, orderId: string): Promise<LabTestResult[]> {
  if (!labId || !orderId) return [];
  try {
    const q = query(
      collection(db, "labs", labId, "results"),
      where("orderId", "==", orderId)
    );
    const snap = await getDocs(q);
    const list: LabTestResult[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabTestResult);
    });
    return list;
  } catch (err) {
    console.error("Error fetching lab results:", err);
    return [];
  }
}

// ============================================================================
// STAFF & FINANCE FUNCTIONS
// ============================================================================

export async function getLabStaff(labId: string): Promise<LabStaffMember[]> {
  if (!labId) return [];
  try {
    const snap = await getDocs(collection(db, "labs", labId, "staff"));
    const list: LabStaffMember[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabStaffMember);
    });
    return list;
  } catch (err) {
    console.error("Error fetching lab staff:", err);
    return [];
  }
}

export async function addLabStaffMember(
  labId: string,
  staff: Omit<LabStaffMember, 'id' | 'labId' | 'createdAt'>
): Promise<LabStaffMember> {
  const ref = doc(collection(db, "labs", labId, "staff"));
  const now = new Date().toISOString();
  const item: LabStaffMember = {
    ...staff,
    id: ref.id,
    labId,
    createdAt: now
  };
  await setDoc(ref, sanitizeFirestoreData(item));
  return item;
}

export async function addLabTransaction(
  labId: string,
  tx: Omit<LabTransaction, 'id' | 'labId' | 'createdAt'>
): Promise<LabTransaction> {
  const ref = doc(collection(db, "labs", labId, "finances"));
  const now = new Date().toISOString();
  const item: LabTransaction = {
    ...tx,
    id: ref.id,
    labId,
    createdAt: now
  };
  await setDoc(ref, sanitizeFirestoreData(item));
  return item;
}

export async function getLabTransactions(labId: string): Promise<LabTransaction[]> {
  if (!labId) return [];
  try {
    const q = query(collection(db, "labs", labId, "finances"), limit(100));
    const snap = await getDocs(q);
    const list: LabTransaction[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LabTransaction);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Error fetching lab finances:", err);
    return [];
  }
}

// ============================================================================
// AI LAB ASSISTANT HELPER
// ============================================================================

export function generateAIPatientExplanation(resultItems: LabTestResultItem[]): string {
  const abnormalItems = resultItems.filter((i) => i.flag === 'high' || i.flag === 'low' || i.flag === 'critical');
  
  if (abnormalItems.length === 0) {
    return "جميع مؤشرات نتائج التحليل ضمن المدى الطبيعي السليم بفضل الله. ننصح بالمتابعة الدورية وصحتكم بألف خير.";
  }

  const itemsList = abnormalItems.map((i) => {
    const statusText = i.flag === 'high' ? 'أعلى من المعدل الطبيعي' : i.flag === 'low' ? 'أقل من المعدل الطبيعي' : 'حرج ويتطلب انتباه';
    return `• ${i.parameterName}: النتيجة (${i.value} ${i.unit}) - ${statusText} (المدى الطبيعي: ${i.referenceRange}).`;
  }).join("\n");

  return `تنبيه مبسط للنتائج:\n${itemsList}\n\nيرجى عرض هذه النتائج على الطبيب المعالج للحصول على التقييم الطبي الدقيق والخطة العلاجية المناسبة.`;
}
