// ══════════════════════════════════════
//  BaanTask i18n — Full Translation System
//  10 languages × ~120 keys
// ══════════════════════════════════════

const I18N = {
  // ── Splash ──
  splash_tagline: {
    en:'Made for expats in Thailand 🇹🇭', th:'สร้างสำหรับชาวต่างชาติในไทย 🇹🇭', ru:'Создано для экспатов в Таиланде 🇹🇭',
    ph:'Para sa mga expat sa Thailand 🇹🇭', mm:'ထိုင်းနိုင်ငံရှိ expats အတွက်ဖန်တီးထားသည် 🇹🇭', zh:'为泰国外籍人士打造 🇹🇭',
    de:'Für Expats in Thailand 🇹🇭', fr:'Conçu pour les expatriés en Thaïlande 🇹🇭', ar:'صُنع للمغتربين في تايلاند 🇹🇭', id:'Dibuat untuk ekspatriat di Thailand 🇹🇭'
  },
  // ── Role select ──
  who_are_you: { en:'Who are you?', th:'คุณเป็นใคร?', ru:'Кто вы?', ph:'Sino ka?', mm:'သင်ဘယ်သူလဲ?', zh:'你是谁？', de:'Wer bist du?', fr:'Qui êtes-vous ?', ar:'من أنت؟', id:'Siapa Anda?' },
  role_choose: { en:'Choose so we can set up the right app for you', th:'เลือกเพื่อเราจะตั้งค่าแอปที่เหมาะกับคุณ', ru:'Выберите, чтобы мы настроили приложение для вас', ph:'Piliin para ma-setup namin ang tamang app para sa iyo', mm:'သင့်အတွက်မှန်ကန်တဲ့appကိုsetupလုပ်နိုင်ဖို့ ရွေးချယ်ပါ', zh:'选择以便我们为您设置正确的应用', de:'Wählen Sie, damit wir die richtige App einrichten', fr:'Choisissez pour configurer la bonne application', ar:'اختر حتى نتمكن من إعداد التطبيق المناسب لك', id:'Pilih agar kami bisa mengatur aplikasi yang tepat untuk Anda' },
  im_owner: { en:"I'm an Owner", th:'ฉันเป็นเจ้าของ', ru:'Я владелец', ph:'May-ari ako', mm:'ငါပိုင်ရှင်ပါ', zh:'我是业主', de:'Ich bin Eigentümer', fr:'Je suis propriétaire', ar:'أنا مالك', id:'Saya Pemilik' },
  owner_desc: { en:'I hire and manage household staff', th:'ฉันจ้างและจัดการพนักงานในบ้าน', ru:'Я нанимаю и управляю домашним персоналом', ph:'Nag-hire at namamahala ng kasambahay', mm:'အိမ်ဝန်ထမ်းများကို ငှားရမ်းပြီး စီမံခန့်ခွဲပါတယ်', zh:'我雇佣和管理家政人员', de:'Ich stelle Hauspersonal ein und verwalte es', fr:'J\'embauche et gère le personnel de maison', ar:'أقوم بتوظيف وإدارة الموظفين المنزليين', id:'Saya mempekerjakan dan mengelola staf rumah tangga' },
  im_worker: { en:"I'm a Worker", th:'ฉันเป็นพนักงาน', ru:'Я работник', ph:'Manggagawa ako', mm:'ငါအလုပ်သမားပါ', zh:'我是工人', de:'Ich bin Arbeiter', fr:'Je suis employé', ar:'أنا عامل', id:'Saya Pekerja' },
  worker_desc: { en:"I work at someone's home", th:'ฉันทำงานที่บ้านคนอื่น', ru:'Я работаю в чужом доме', ph:'Nagtatrabaho ako sa bahay ng iba', mm:'သူများအိမ်မှာအလုပ်လုပ်ပါတယ်', zh:'我在别人家工作', de:'Ich arbeite im Haushalt', fr:"Je travaille chez quelqu'un", ar:'أعمل في منزل شخص ما', id:'Saya bekerja di rumah orang' },
  role_hint: { en:'Not sure? Choose Owner — you can switch later in Settings', th:'ไม่แน่ใจ? เลือกเจ้าของ — เปลี่ยนทีหลังได้ในตั้งค่า', ru:'Не уверены? Выберите Владелец — можно изменить в Настройках', ph:'Hindi sigurado? Piliin ang May-ari — mababago mo sa Settings', mm:'မသေချာဘူးလား? ပိုင်ရှင်ကိုရွေးပါ — Settingsမှာနောက်မှပြောင်းနိုင်ပါတယ်', zh:'不确定？选择业主——稍后可在设置中更改', de:'Unsicher? Wählen Sie Eigentümer — Sie können später wechseln', fr:'Pas sûr ? Choisissez Propriétaire — vous pourrez changer plus tard', ar:'غير متأكد؟ اختر مالك — يمكنك التغيير لاحقاً في الإعدادات', id:'Tidak yakin? Pilih Pemilik — bisa diubah nanti di Pengaturan' },
  // ── Registration ──
  create_account: { en:'Create Your Account', th:'สร้างบัญชีของคุณ', ru:'Создайте аккаунт', ph:'Gumawa ng Account', mm:'သင့်အကောင့်ဖန်တီးပါ', zh:'创建账户', de:'Konto erstellen', fr:'Créer votre compte', ar:'أنشئ حسابك', id:'Buat Akun Anda' },
  owner_reg: { en:'Owner registration', th:'ลงทะเบียนเจ้าของ', ru:'Регистрация владельца', ph:'Rehistro ng may-ari', mm:'ပိုင်ရှင်မှတ်ပုံတင်ခြင်း', zh:'业主注册', de:'Eigentümer-Registrierung', fr:'Inscription propriétaire', ar:'تسجيل المالك', id:'Registrasi pemilik' },
  full_name: { en:'Full Name', th:'ชื่อ-นามสกุล', ru:'Полное имя', ph:'Buong pangalan', mm:'အမည်အပြည့်အစုံ', zh:'全名', de:'Vollständiger Name', fr:'Nom complet', ar:'الاسم الكامل', id:'Nama Lengkap' },
  email: { en:'Email', th:'อีเมล', ru:'Эл. почта', ph:'Email', mm:'အီးမေးလ်', zh:'电子邮件', de:'E-Mail', fr:'E-mail', ar:'البريد الإلكتروني', id:'Email' },
  phone_optional: { en:'Phone (optional)', th:'โทรศัพท์ (ไม่จำเป็น)', ru:'Телефон (необязательно)', ph:'Telepono (opsyonal)', mm:'ဖုန်း (မလိုအပ်ပါ)', zh:'电话（可选）', de:'Telefon (optional)', fr:'Téléphone (optionnel)', ar:'الهاتف (اختياري)', id:'Telepon (opsional)' },
  gender: { en:'Gender', th:'เพศ', ru:'Пол', ph:'Kasarian', mm:'လိင်', zh:'性别', de:'Geschlecht', fr:'Genre', ar:'الجنس', id:'Jenis Kelamin' },
  male: { en:'Male', th:'ชาย', ru:'Мужской', ph:'Lalaki', mm:'ကျား', zh:'男', de:'Männlich', fr:'Homme', ar:'ذكر', id:'Laki-laki' },
  female: { en:'Female', th:'หญิง', ru:'Женский', ph:'Babae', mm:'မ', zh:'女', de:'Weiblich', fr:'Femme', ar:'أنثى', id:'Perempuan' },
  dob: { en:'Date of Birth', th:'วันเกิด', ru:'Дата рождения', ph:'Petsa ng kapanganakan', mm:'မွေးသက္ကရာဇ်', zh:'出生日期', de:'Geburtsdatum', fr:'Date de naissance', ar:'تاريخ الميلاد', id:'Tanggal Lahir' },
  pin_label: { en:'4-Digit PIN', th:'รหัส PIN 4 หลัก', ru:'4-значный PIN', ph:'4 na digit na PIN', mm:'ဂဏန်း 4 လုံး PIN', zh:'4位PIN码', de:'4-stellige PIN', fr:'Code PIN à 4 chiffres', ar:'رقم PIN مكون من 4 أرقام', id:'PIN 4 Digit' },
  send_code: { en:'Send Verification Code', th:'ส่งรหัสยืนยัน', ru:'Отправить код', ph:'Ipadala ang code', mm:'အတည်ပြုကုဒ်ပို့ပါ', zh:'发送验证码', de:'Code senden', fr:'Envoyer le code', ar:'إرسال رمز التحقق', id:'Kirim Kode Verifikasi' },
  have_account: { en:'Already have an account? Sign in', th:'มีบัญชีแล้ว? เข้าสู่ระบบ', ru:'Уже есть аккаунт? Войти', ph:'May account na? Mag-sign in', mm:'အကောင့်ရှိပြီးသားလား? ဝင်ပါ', zh:'已有账户？登录', de:'Bereits ein Konto? Anmelden', fr:'Déjà un compte ? Se connecter', ar:'لديك حساب بالفعل؟ تسجيل الدخول', id:'Sudah punya akun? Masuk' },
  // ── OTP ──
  verify_email: { en:'Verify Email', th:'ยืนยันอีเมล', ru:'Подтвердите почту', ph:'I-verify ang email', mm:'အီးမေးလ်အတည်ပြုပါ', zh:'验证邮箱', de:'E-Mail bestätigen', fr:'Vérifier e-mail', ar:'تحقق من البريد', id:'Verifikasi Email' },
  check_email: { en:'Check Your Email', th:'ตรวจสอบอีเมลของคุณ', ru:'Проверьте почту', ph:'Tingnan ang email mo', mm:'သင့်အီးမေးလ်ကိုစစ်ဆေးပါ', zh:'查看您的邮箱', de:'E-Mail prüfen', fr:'Vérifiez votre e-mail', ar:'تحقق من بريدك', id:'Periksa Email Anda' },
  enter_code: { en:'Enter the 6-digit code', th:'กรอกรหัส 6 หลัก', ru:'Введите 6-значный код', ph:'Ilagay ang 6-digit code', mm:'ဂဏန်း 6 လုံးကုဒ်ထည့်ပါ', zh:'输入6位验证码', de:'6-stelligen Code eingeben', fr:'Entrez le code à 6 chiffres', ar:'أدخل الرمز المكون من 6 أرقام', id:'Masukkan kode 6 digit' },
  verify_continue: { en:'Verify & Continue', th:'ยืนยันและดำเนินการ', ru:'Подтвердить', ph:'I-verify at magpatuloy', mm:'အတည်ပြုပြီး ဆက်လက်ပါ', zh:'验证并继续', de:'Bestätigen & Weiter', fr:'Vérifier et continuer', ar:'تحقق واستمر', id:'Verifikasi & Lanjutkan' },
  resend_code: { en:'Resend code', th:'ส่งรหัสอีกครั้ง', ru:'Отправить повторно', ph:'I-resend ang code', mm:'ကုဒ်ပြန်ပို့ပါ', zh:'重新发送', de:'Code erneut senden', fr:'Renvoyer le code', ar:'إعادة إرسال الرمز', id:'Kirim ulang kode' },
  // ── Sign in ──
  welcome_back: { en:'Welcome Back', th:'ยินดีต้อนรับกลับ', ru:'С возвращением', ph:'Welcome Back', mm:'ပြန်လာတာကြိုဆိုပါတယ်', zh:'欢迎回来', de:'Willkommen zurück', fr:'Bon retour', ar:'مرحباً بعودتك', id:'Selamat Datang Kembali' },
  sign_in_sub: { en:'Sign in with email & PIN', th:'เข้าสู่ระบบด้วยอีเมลและ PIN', ru:'Войдите с email и PIN', ph:'Mag-sign in gamit ang email at PIN', mm:'အီးမေးလ်နှင့် PIN ဖြင့်ဝင်ပါ', zh:'使用邮箱和PIN登录', de:'Mit E-Mail & PIN anmelden', fr:'Se connecter avec e-mail & PIN', ar:'تسجيل الدخول بالبريد والرقم السري', id:'Masuk dengan email & PIN' },
  sign_in: { en:'Sign In', th:'เข้าสู่ระบบ', ru:'Войти', ph:'Mag-sign in', mm:'ဝင်ရန်', zh:'登录', de:'Anmelden', fr:'Se connecter', ar:'تسجيل الدخول', id:'Masuk' },
  create_new: { en:'Create new account', th:'สร้างบัญชีใหม่', ru:'Создать аккаунт', ph:'Gumawa ng bagong account', mm:'အကောင့်အသစ်ဖန်တီးပါ', zh:'创建新账户', de:'Neues Konto erstellen', fr:'Créer un nouveau compte', ar:'إنشاء حساب جديد', id:'Buat akun baru' },
  // ── Property ──
  your_property: { en:'Your Property', th:'ทรัพย์สินของคุณ', ru:'Ваша недвижимость', ph:'Iyong Property', mm:'သင့်အိမ်ခြံမြေ', zh:'您的房产', de:'Ihre Immobilie', fr:'Votre propriété', ar:'ملكيتك', id:'Properti Anda' },
  tell_home: { en:'Tell us about your home', th:'บอกเราเกี่ยวกับบ้านของคุณ', ru:'Расскажите о вашем доме', ph:'Sabihin sa amin ang iyong tahanan', mm:'သင့်အိမ်အကြောင်းပြောပြပါ', zh:'告诉我们您的家', de:'Erzählen Sie uns von Ihrem Zuhause', fr:'Parlez-nous de votre maison', ar:'أخبرنا عن منزلك', id:'Ceritakan tentang rumah Anda' },
  house: { en:'House', th:'บ้าน', ru:'Дом', ph:'Bahay', mm:'အိမ်', zh:'房屋', de:'Haus', fr:'Maison', ar:'منزل', id:'Rumah' },
  condo: { en:'Condo', th:'คอนโด', ru:'Квартира', ph:'Condo', mm:'ကွန်ဒို', zh:'公寓', de:'Wohnung', fr:'Appart.', ar:'شقة', id:'Kondo' },
  villa: { en:'Villa', th:'วิลล่า', ru:'Вилла', ph:'Villa', mm:'ဗီလာ', zh:'别墅', de:'Villa', fr:'Villa', ar:'فيلا', id:'Vila' },
  other: { en:'Other', th:'อื่นๆ', ru:'Другое', ph:'Iba pa', mm:'အခြား', zh:'其他', de:'Andere', fr:'Autre', ar:'أخرى', id:'Lainnya' },
  prop_name: { en:'Property Name', th:'ชื่อที่พัก', ru:'Название', ph:'Pangalan ng property', mm:'အိမ်ခြံမြေအမည်', zh:'房产名称', de:'Immobilienname', fr:'Nom de la propriété', ar:'اسم الملكية', id:'Nama Properti' },
  location: { en:'Location / City', th:'สถานที่ / เมือง', ru:'Город', ph:'Lokasyon', mm:'တည်နေရာ', zh:'位置/城市', de:'Standort / Stadt', fr:'Lieu / Ville', ar:'الموقع / المدينة', id:'Lokasi / Kota' },
  continue_btn: { en:'Continue', th:'ดำเนินการต่อ', ru:'Продолжить', ph:'Magpatuloy', mm:'ဆက်လက်ပါ', zh:'继续', de:'Weiter', fr:'Continuer', ar:'متابعة', id:'Lanjutkan' },
  // ── Invite ──
  invite_staff: { en:'Invite Your Staff', th:'เชิญพนักงานของคุณ', ru:'Пригласите персонал', ph:'I-invite ang staff', mm:'သင့်ဝန်ထမ်းများကိုဖိတ်ပါ', zh:'邀请您的员工', de:'Personal einladen', fr:'Inviter votre personnel', ar:'ادعُ موظفيك', id:'Undang Staf Anda' },
  share_code: { en:'Share This Code', th:'แชร์รหัสนี้', ru:'Поделитесь кодом', ph:'I-share ang code', mm:'ဒီကုဒ်ကိုမျှဝေပါ', zh:'分享此代码', de:'Code teilen', fr:'Partager ce code', ar:'شارك هذا الرمز', id:'Bagikan Kode Ini' },
  invite_code: { en:'Invite Code', th:'รหัสเชิญ', ru:'Код приглашения', ph:'Invite Code', mm:'ဖိတ်ကြားကုဒ်', zh:'邀请码', de:'Einladungscode', fr:'Code d\'invitation', ar:'رمز الدعوة', id:'Kode Undangan' },
  workers_enter_code: { en:'Workers enter this code when they sign up', th:'พนักงานกรอกรหัสนี้ตอนลงทะเบียน', ru:'Работники вводят этот код при регистрации', ph:'I-enter ng workers ang code na ito sa sign up', mm:'ဝန်ထမ်းများ sign up လုပ်တဲ့အခါ ဒီကုဒ်ထည့်ပါ', zh:'员工注册时输入此代码', de:'Mitarbeiter geben diesen Code bei der Anmeldung ein', fr:'Les employés entrent ce code lors de l\'inscription', ar:'يدخل العمال هذا الرمز عند التسجيل', id:'Pekerja memasukkan kode ini saat mendaftar' },
  go_dashboard: { en:'Go to Dashboard', th:'ไปที่แดชบอร์ด', ru:'К панели', ph:'Pumunta sa Dashboard', mm:'Dashboard သို့သွားပါ', zh:'前往仪表板', de:'Zum Dashboard', fr:'Aller au tableau de bord', ar:'الذهاب إلى لوحة المعلومات', id:'Ke Dashboard' },
  skip: { en:'Skip for now', th:'ข้ามไปก่อน', ru:'Пропустить', ph:'I-skip muna', mm:'ယခုကျော်ပါ', zh:'暂时跳过', de:'Überspringen', fr:'Passer pour le moment', ar:'تخطي الآن', id:'Lewati dulu' },
  // ── Worker register/join ──
  join_household: { en:'Join a Household', th:'เข้าร่วมบ้าน', ru:'Присоединиться', ph:'Sumali sa bahay', mm:'အိမ်ထောင်စုတစ်ခုတွင်ပါဝင်ပါ', zh:'加入家庭', de:'Haushalt beitreten', fr:'Rejoindre un foyer', ar:'الانضمام إلى منزل', id:'Bergabung dengan Rumah Tangga' },
  worker_reg: { en:'Create your worker account', th:'สร้างบัญชีพนักงาน', ru:'Создайте аккаунт работника', ph:'Gumawa ng worker account', mm:'Worker account ဖန်တီးပါ', zh:'创建工人账户', de:'Mitarbeiterkonto erstellen', fr:'Créer votre compte employé', ar:'أنشئ حساب العامل', id:'Buat akun pekerja' },
  enter_invite: { en:'Enter Invite Code', th:'กรอกรหัสเชิญ', ru:'Введите код', ph:'Ilagay ang invite code', mm:'ဖိတ်ကြားကုဒ်ထည့်ပါ', zh:'输入邀请码', de:'Einladungscode eingeben', fr:'Entrer le code d\'invitation', ar:'أدخل رمز الدعوة', id:'Masukkan Kode Undangan' },
  ask_employer: { en:'Ask your employer for the code', th:'ขอรหัสจากนายจ้าง', ru:'Спросите код у работодателя', ph:'Hingin ang code sa employer', mm:'ကုဒ်ကိုအလုပ်ရှင်ဆီမှတောင်းပါ', zh:'向雇主索取代码', de:'Fragen Sie Ihren Arbeitgeber', fr:'Demandez le code à votre employeur', ar:'اطلب الرمز من صاحب العمل', id:'Minta kode dari majikan Anda' },
  your_role: { en:'Your Role', th:'ตำแหน่งของคุณ', ru:'Ваша роль', ph:'Role mo', mm:'သင့်အခန်းကဏ္ဍ', zh:'你的角色', de:'Ihre Rolle', fr:'Votre rôle', ar:'دورك', id:'Peran Anda' },
  select_role: { en:'Select role...', th:'เลือกตำแหน่ง...', ru:'Выберите роль...', ph:'Pumili ng role...', mm:'အခန်းကဏ္ဍရွေးပါ...', zh:'选择角色...', de:'Rolle wählen...', fr:'Sélectionner le rôle...', ar:'اختر الدور...', id:'Pilih peran...' },
  cleaner: { en:'Cleaner', th:'แม่บ้าน', ru:'Уборщик', ph:'Taga-linis', mm:'သန့်ရှင်းရေး', zh:'清洁工', de:'Reinigungskraft', fr:'Agent de ménage', ar:'عامل نظافة', id:'Pembersih' },
  cook: { en:'Cook', th:'พ่อครัว/แม่ครัว', ru:'Повар', ph:'Kusinero', mm:'ထမင်းချက်', zh:'厨师', de:'Koch/Köchin', fr:'Cuisinier', ar:'طباخ', id:'Juru Masak' },
  driver: { en:'Driver', th:'คนขับรถ', ru:'Водитель', ph:'Driver', mm:'ယာဥ်မောင်း', zh:'司机', de:'Fahrer', fr:'Chauffeur', ar:'سائق', id:'Sopir' },
  nanny: { en:'Nanny', th:'พี่เลี้ยงเด็ก', ru:'Няня', ph:'Yaya', mm:'ကလေးထိန်း', zh:'保姆', de:'Kindermädchen', fr:'Nounou', ar:'مربية', id:'Pengasuh' },
  gardener: { en:'Gardener', th:'คนสวน', ru:'Садовник', ph:'Hardinero', mm:'ဥယျာဉ်မှူး', zh:'园丁', de:'Gärtner', fr:'Jardinier', ar:'بستاني', id:'Tukang Kebun' },
  // ── Dashboard ──
  good_morning: { en:'Good morning 👋', th:'สวัสดีตอนเช้า 👋', ru:'Доброе утро 👋', ph:'Magandang umaga 👋', mm:'မင်္ဂလာနံနက်ခင်းပါ 👋', zh:'早上好 👋', de:'Guten Morgen 👋', fr:'Bonjour 👋', ar:'صباح الخير 👋', id:'Selamat Pagi 👋' },
  good_afternoon: { en:'Good afternoon 👋', th:'สวัสดีตอนบ่าย 👋', ru:'Добрый день 👋', ph:'Magandang hapon 👋', mm:'မင်္ဂလာနေ့ခင်းပါ 👋', zh:'下午好 👋', de:'Guten Nachmittag 👋', fr:'Bon après-midi 👋', ar:'مساء الخير 👋', id:'Selamat Siang 👋' },
  good_evening: { en:'Good evening 👋', th:'สวัสดีตอนเย็น 👋', ru:'Добрый вечер 👋', ph:'Magandang gabi 👋', mm:'မင်္ဂလာညနေခင်းပါ 👋', zh:'晚上好 👋', de:'Guten Abend 👋', fr:'Bonsoir 👋', ar:'مساء الخير 👋', id:'Selamat Malam 👋' },
  workers_label: { en:'Workers', th:'พนักงาน', ru:'Работники', ph:'Workers', mm:'ဝန်ထမ်းများ', zh:'员工', de:'Mitarbeiter', fr:'Employés', ar:'العمال', id:'Pekerja' },
  tasks_today: { en:'Tasks today', th:'งานวันนี้', ru:'Задач сегодня', ph:'Tasks ngayon', mm:'ယနေ့ tasks', zh:'今日任务', de:'Aufgaben heute', fr:"Tâches aujourd'hui", ar:'المهام اليوم', id:'Tugas hari ini' },
  todays_workers: { en:"Today's Workers", th:'พนักงานวันนี้', ru:'Работники сегодня', ph:'Workers ngayon', mm:'ယနေ့ဝန်ထမ်းများ', zh:'今日员工', de:'Heutige Mitarbeiter', fr:"Employés du jour", ar:'عمال اليوم', id:'Pekerja Hari Ini' },
  see_all: { en:'See all →', th:'ดูทั้งหมด →', ru:'Все →', ph:'Tingnan lahat →', mm:'အားလုံးကြည့်ပါ →', zh:'查看全部 →', de:'Alle anzeigen →', fr:'Voir tout →', ar:'عرض الكل →', id:'Lihat semua →' },
  expenses_month: { en:'Expenses this month', th:'ค่าใช้จ่ายเดือนนี้', ru:'Расходы за месяц', ph:'Expenses ngayong buwan', mm:'ဒီလစရိတ်များ', zh:'本月支出', de:'Ausgaben diesen Monat', fr:'Dépenses ce mois', ar:'نفقات هذا الشهر', id:'Pengeluaran bulan ini' },
  // ── Nav ──
  nav_home: { en:'Home', th:'หน้าแรก', ru:'Главная', ph:'Home', mm:'ပင်မ', zh:'首页', de:'Start', fr:'Accueil', ar:'الرئيسية', id:'Beranda' },
  nav_payroll: { en:'Payroll', th:'เงินเดือน', ru:'Зарплата', ph:'Payroll', mm:'လစာ', zh:'工资', de:'Gehalt', fr:'Paie', ar:'الرواتب', id:'Gaji' },
  nav_tasks: { en:'Tasks', th:'งาน', ru:'Задачи', ph:'Tasks', mm:'Tasks', zh:'任务', de:'Aufgaben', fr:'Tâches', ar:'المهام', id:'Tugas' },
  nav_chat: { en:'Chat', th:'แชท', ru:'Чат', ph:'Chat', mm:'Chat', zh:'聊天', de:'Chat', fr:'Chat', ar:'محادثة', id:'Chat' },
  nav_me: { en:'Me', th:'ฉัน', ru:'Профиль', ph:'Me', mm:'ကျွန်တော်', zh:'我', de:'Ich', fr:'Moi', ar:'حسابي', id:'Saya' },
  nav_schedule: { en:'Schedule', th:'ตารางงาน', ru:'Расписание', ph:'Schedule', mm:'အချိန်ဇယား', zh:'排班', de:'Zeitplan', fr:'Planning', ar:'الجدول', id:'Jadwal' },
  // ── Tasks ──
  new_task: { en:'＋ New Task', th:'＋ งานใหม่', ru:'＋ Новая задача', ph:'＋ Bagong Task', mm:'＋ Task အသစ်', zh:'＋ 新任务', de:'＋ Neue Aufgabe', fr:'＋ Nouvelle tâche', ar:'＋ مهمة جديدة', id:'＋ Tugas Baru' },
  all: { en:'All', th:'ทั้งหมด', ru:'Все', ph:'Lahat', mm:'အားလုံး', zh:'全部', de:'Alle', fr:'Tous', ar:'الكل', id:'Semua' },
  pending: { en:'Pending', th:'รอดำเนินการ', ru:'Ожидание', ph:'Pending', mm:'ဆိုင်းငံ့', zh:'待处理', de:'Ausstehend', fr:'En attente', ar:'معلق', id:'Tertunda' },
  in_progress: { en:'In Progress', th:'กำลังดำเนินการ', ru:'В процессе', ph:'In Progress', mm:'လုပ်ဆောင်နေ', zh:'进行中', de:'In Bearbeitung', fr:'En cours', ar:'قيد التنفيذ', id:'Sedang Berlangsung' },
  done: { en:'Done', th:'เสร็จแล้ว', ru:'Готово', ph:'Tapos na', mm:'ပြီးပြီ', zh:'已完成', de:'Erledigt', fr:'Terminé', ar:'تم', id:'Selesai' },
  what_done: { en:'What needs to be done?', th:'ต้องทำอะไร?', ru:'Что нужно сделать?', ph:'Ano ang kailangang gawin?', mm:'ဘာလုပ်ရမလဲ?', zh:'需要做什么？', de:'Was muss getan werden?', fr:'Que faut-il faire ?', ar:'ما الذي يجب القيام به؟', id:'Apa yang perlu dilakukan?' },
  description: { en:'Description (optional)', th:'รายละเอียด (ไม่จำเป็น)', ru:'Описание', ph:'Description (opsyonal)', mm:'ဖော်ပြချက် (မလိုအပ်ပါ)', zh:'描述（可选）', de:'Beschreibung', fr:'Description (optionnel)', ar:'الوصف (اختياري)', id:'Deskripsi (opsional)' },
  assign_to: { en:'Assign to', th:'มอบหมายให้', ru:'Назначить', ph:'I-assign sa', mm:'တာဝန်ပေးရန်', zh:'分配给', de:'Zuweisen an', fr:'Assigner à', ar:'تعيين إلى', id:'Tugaskan ke' },
  how_often: { en:'How often?', th:'บ่อยแค่ไหน?', ru:'Как часто?', ph:'Gaano kadalas?', mm:'ဘယ်လောက်မကြာခဏ?', zh:'多久一次？', de:'Wie oft?', fr:'À quelle fréquence ?', ar:'كم مرة؟', id:'Seberapa sering?' },
  just_once: { en:'Just once', th:'ครั้งเดียว', ru:'Один раз', ph:'Isang beses lang', mm:'တစ်ခါတည်း', zh:'仅一次', de:'Einmalig', fr:'Une fois', ar:'مرة واحدة', id:'Sekali saja' },
  weekly: { en:'Weekly', th:'รายสัปดาห์', ru:'Еженедельно', ph:'Weekly', mm:'အပတ်စဉ်', zh:'每周', de:'Wöchentlich', fr:'Hebdomadaire', ar:'أسبوعي', id:'Mingguan' },
  daily: { en:'Daily', th:'รายวัน', ru:'Ежедневно', ph:'Araw-araw', mm:'နေ့စဉ်', zh:'每天', de:'Täglich', fr:'Quotidien', ar:'يومي', id:'Harian' },
  due_date: { en:'Due date', th:'วันครบกำหนด', ru:'Дата', ph:'Due date', mm:'သတ်မှတ်ရက်', zh:'截止日期', de:'Fälligkeitsdatum', fr:'Date limite', ar:'تاريخ الاستحقاق', id:'Tanggal jatuh tempo' },
  due_time: { en:'Due time', th:'เวลาครบกำหนด', ru:'Время', ph:'Due time', mm:'သတ်မှတ်အချိန်', zh:'截止时间', de:'Fälligkeitszeit', fr:'Heure limite', ar:'وقت الاستحقاق', id:'Waktu jatuh tempo' },
  priority: { en:'Priority', th:'ลำดับความสำคัญ', ru:'Приоритет', ph:'Priority', mm:'ဦးစားပေး', zh:'优先级', de:'Priorität', fr:'Priorité', ar:'الأولوية', id:'Prioritas' },
  urgent: { en:'🔴 Urgent', th:'🔴 เร่งด่วน', ru:'🔴 Срочно', ph:'🔴 Urgent', mm:'🔴 အရေးပေါ်', zh:'🔴 紧急', de:'🔴 Dringend', fr:'🔴 Urgent', ar:'🔴 عاجل', id:'🔴 Mendesak' },
  normal: { en:'🟡 Normal', th:'🟡 ปกติ', ru:'🟡 Обычный', ph:'🟡 Normal', mm:'🟡 ပုံမှန်', zh:'🟡 普通', de:'🟡 Normal', fr:'🟡 Normal', ar:'🟡 عادي', id:'🟡 Normal' },
  low: { en:'🔵 Low', th:'🔵 ต่ำ', ru:'🔵 Низкий', ph:'🔵 Low', mm:'🔵 နိမ့်', zh:'🔵 低', de:'🔵 Niedrig', fr:'🔵 Bas', ar:'🔵 منخفض', id:'🔵 Rendah' },
  send_task: { en:'Send Task →', th:'ส่งงาน →', ru:'Отправить →', ph:'Ipadala ang Task →', mm:'Task ပို့ပါ →', zh:'发送任务 →', de:'Aufgabe senden →', fr:'Envoyer la tâche →', ar:'إرسال المهمة →', id:'Kirim Tugas →' },
  // ── Workers ──
  my_workers: { en:'My Workers', th:'พนักงานของฉัน', ru:'Мои работники', ph:'Mga Workers ko', mm:'ကျွန်တော့်ဝန်ထမ်းများ', zh:'我的员工', de:'Meine Mitarbeiter', fr:'Mes employés', ar:'عمالي', id:'Pekerja Saya' },
  add_worker: { en:'＋ Add', th:'＋ เพิ่ม', ru:'＋ Добавить', ph:'＋ Dagdag', mm:'＋ ထည့်ပါ', zh:'＋ 添加', de:'＋ Hinzufügen', fr:'＋ Ajouter', ar:'＋ إضافة', id:'＋ Tambah' },
  no_workers: { en:'No workers yet. Share your invite code!', th:'ยังไม่มีพนักงาน แชร์รหัสเชิญของคุณ!', ru:'Работников пока нет. Поделитесь кодом!', ph:'Wala pang workers. I-share ang invite code!', mm:'ဝန်ထမ်းမရှိသေးပါ။ ဖိတ်ကြားကုဒ်ကိုမျှဝေပါ!', zh:'还没有员工。分享您的邀请码！', de:'Noch keine Mitarbeiter. Teilen Sie Ihren Code!', fr:"Pas encore d'employés. Partagez votre code!", ar:'لا يوجد عمال بعد. شارك رمز الدعوة!', id:'Belum ada pekerja. Bagikan kode undangan!' },
  // ── Payroll ──
  payroll_title: { en:'💼 Payroll', th:'💼 เงินเดือน', ru:'💼 Зарплата', ph:'💼 Payroll', mm:'💼 လစာ', zh:'💼 工资', de:'💼 Gehalt', fr:'💼 Paie', ar:'💼 الرواتب', id:'💼 Gaji' },
  tap_worker: { en:'Tap a worker to see attendance & salary', th:'แตะพนักงานเพื่อดูการเข้างานและเงินเดือน', ru:'Нажмите на работника для деталей', ph:'I-tap ang worker para makita ang attendance at salary', mm:'ဝန်ထမ်းတစ်ဦးကိုနှိပ်ပါ', zh:'点击员工查看考勤和工资', de:'Tippen Sie auf einen Mitarbeiter', fr:"Appuyez sur un employé", ar:'اضغط على عامل لعرض الحضور والراتب', id:'Ketuk pekerja untuk melihat absensi & gaji' },
  total_payroll: { en:'Total payroll this month', th:'เงินเดือนรวมเดือนนี้', ru:'Итого зарплат за месяц', ph:'Kabuuang payroll ngayong buwan', mm:'ဒီလလစာစုစုပေါင်း', zh:'本月工资总额', de:'Gesamtgehalt diesen Monat', fr:'Total des salaires ce mois', ar:'إجمالي الرواتب هذا الشهر', id:'Total gaji bulan ini' },
  pay_day: { en:'Pay day: last day of month', th:'วันจ่ายเงิน: วันสุดท้ายของเดือน', ru:'День выплаты: последний день месяца', ph:'Pay day: huling araw ng buwan', mm:'လစာထုတ်ရက်: လကုန်ရက်', zh:'发薪日：月底', de:'Zahltag: letzter Tag des Monats', fr:'Jour de paie: dernier jour du mois', ar:'يوم الدفع: آخر يوم من الشهر', id:'Hari gaji: hari terakhir bulan' },
  // ── Chat ──
  staff_group: { en:'Staff Group Chat', th:'แชทกลุ่มพนักงาน', ru:'Групповой чат', ph:'Staff Group Chat', mm:'Staff Group Chat', zh:'员工群聊', de:'Team-Gruppenchat', fr:'Chat de groupe', ar:'محادثة المجموعة', id:'Chat Grup Staf' },
  tap_open: { en:'Tap to open group chat', th:'แตะเพื่อเปิดแชทกลุ่ม', ru:'Нажмите для чата', ph:'I-tap para buksan', mm:'Group chat ဖွင့်ရန်နှိပ်ပါ', zh:'点击打开群聊', de:'Tippen zum Öffnen', fr:'Appuyez pour ouvrir', ar:'اضغط لفتح المحادثة', id:'Ketuk untuk membuka' },
  // ── Me ──
  invite_code_menu: { en:'Invite Code', th:'รหัสเชิญ', ru:'Код приглашения', ph:'Invite Code', mm:'ဖိတ်ကြားကုဒ်', zh:'邀请码', de:'Einladungscode', fr:"Code d'invitation", ar:'رمز الدعوة', id:'Kode Undangan' },
  notifications: { en:'Notifications', th:'การแจ้งเตือน', ru:'Уведомления', ph:'Notifications', mm:'အကြောင်းကြားချက်များ', zh:'通知', de:'Benachrichtigungen', fr:'Notifications', ar:'الإشعارات', id:'Notifikasi' },
  settings: { en:'Settings', th:'ตั้งค่า', ru:'Настройки', ph:'Settings', mm:'ဆက်တင်များ', zh:'设置', de:'Einstellungen', fr:'Paramètres', ar:'الإعدادات', id:'Pengaturan' },
  log_out: { en:'Log Out', th:'ออกจากระบบ', ru:'Выйти', ph:'Mag-log out', mm:'ထွက်ရန်', zh:'退出', de:'Abmelden', fr:'Déconnexion', ar:'تسجيل الخروج', id:'Keluar' },
  // ── Add worker ──
  add_worker_title: { en:'Add Worker', th:'เพิ่มพนักงาน', ru:'Добавить работника', ph:'Dagdag Worker', mm:'ဝန်ထမ်းထည့်ပါ', zh:'添加员工', de:'Mitarbeiter hinzufügen', fr:'Ajouter un employé', ar:'إضافة عامل', id:'Tambah Pekerja' },
  show_qr: { en:'Show QR Code', th:'แสดง QR Code', ru:'Показать QR-код', ph:'Ipakita ang QR Code', mm:'QR Code ပြပါ', zh:'显示二维码', de:'QR-Code anzeigen', fr:'Afficher le QR Code', ar:'عرض رمز QR', id:'Tampilkan QR Code' },
  send_link: { en:'Send Invite Link', th:'ส่งลิงก์เชิญ', ru:'Отправить ссылку', ph:'Ipadala ang invite link', mm:'ဖိတ်ကြားလင့်ခ်ပို့ပါ', zh:'发送邀请链接', de:'Einladungslink senden', fr:"Envoyer le lien d'invitation", ar:'إرسال رابط الدعوة', id:'Kirim Link Undangan' },
  manual_entry: { en:'Manual Entry', th:'กรอกเอง', ru:'Ручной ввод', ph:'Manual na pag-enter', mm:'ကိုယ်တိုင်ထည့်ပါ', zh:'手动输入', de:'Manuelle Eingabe', fr:'Saisie manuelle', ar:'إدخال يدوي', id:'Entri Manual' },
  // ── Misc ──
  next_shift: { en:'Next shift', th:'กะถัดไป', ru:'След. смена', ph:'Susunod na shift', mm:'နောက် shift', zh:'下次排班', de:'Nächste Schicht', fr:'Prochain créneau', ar:'الوردية التالية', id:'Shift berikutnya' },
  quick_actions: { en:'Quick Actions', th:'การดำเนินการด่วน', ru:'Быстрые действия', ph:'Quick Actions', mm:'မြန်ဆန်လုပ်ဆောင်ချက်', zh:'快捷操作', de:'Schnellaktionen', fr:'Actions rapides', ar:'إجراءات سريعة', id:'Aksi Cepat' },
  expenses: { en:'Expenses', th:'ค่าใช้จ่าย', ru:'Расходы', ph:'Expenses', mm:'စရိတ်များ', zh:'支出', de:'Ausgaben', fr:'Dépenses', ar:'النفقات', id:'Pengeluaran' },
  schedule: { en:'Schedule', th:'ตารางงาน', ru:'Расписание', ph:'Schedule', mm:'အချိန်ဇယား', zh:'排班', de:'Zeitplan', fr:'Planning', ar:'الجدول', id:'Jadwal' },
};

// Language code mapping
const LANG_MAP = { English:'en', Thai:'th', Russian:'ru', Filipino:'ph', Myanmar:'mm', Chinese:'zh', German:'de', French:'fr', Arabic:'ar', Indonesian:'id' };

function t(key) {
  const lc = LANG_MAP[selectedLang] || 'en';
  const entry = I18N[key];
  if (!entry) return key;
  return entry[lc] || entry.en || key;
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' && el.placeholder !== undefined && el.dataset.i18nType === 'placeholder') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
}
