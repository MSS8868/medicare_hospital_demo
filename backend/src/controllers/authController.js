require('dotenv').config();
const { User, Patient, Doctor, Department } = require('../models');
const { generateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// OTP sender — tries Twilio if configured, silently falls back to demo
async function sendOTPViaSMS(mobile, otp) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from && !sid.startsWith('your_')) {
    try {
      const twilio = require('twilio');
      await twilio(sid, token).messages.create({
        body: `Your MediCare OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
        from, to: `+91${mobile}`,
      });
      return { channel: 'sms' };
    } catch (err) {
      logger.error(`Twilio failed for ${mobile}: ${err.message}`);
    }
  }
  // Demo fallback — always works
  console.log(`\n📱 DEMO OTP for ${mobile}: ${otp}\n`);
  return { channel: 'demo' };
}

// SEND OTP — never crashes
exports.sendOTP = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').trim();
    if (!mobile || !/^\d{10}$/.test(mobile))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });

    const isDemo = process.env.OTP_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';
    const otp = isDemo ? (process.env.STATIC_OTP || '123456')
                       : String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findOne({ where: { mobile } });
    if (!user) {
      user = await User.create({ id: uuidv4(), mobile, name: 'New Patient', role: 'patient', otp, otpExpiry, isActive: true });
    } else {
      await user.update({ otp, otpExpiry });
    }

    const result = await sendOTPViaSMS(mobile, otp);

    res.json({
      success: true,
      message: result.channel === 'demo' ? `Demo OTP: ${otp}` : 'OTP sent to your mobile',
      ...(result.channel === 'demo' && { demoOtp: otp }),
      isNewUser: user.name === 'New Patient',
    });
  } catch (err) {
    logger.error('sendOTP error:', err);
    res.status(500).json({ success: false, message: 'Could not send OTP. Please try again.' });
  }
};

// VERIFY OTP
exports.verifyOTP = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').trim();
    const otp    = String(req.body.otp    || '').trim();

    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });

    const user = await User.findOne({ where: { mobile } });
    if (!user)
      return res.status(404).json({ success: false, message: 'Account not found. Please request OTP first.' });
    if (String(user.otp) !== otp)
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    if (new Date() > new Date(user.otpExpiry))
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });

    await user.update({ otp: null, otpExpiry: null, lastLogin: new Date() });
    const token = generateToken(user);

    let profile = null, needsProfile = false;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ where: { userId: user.id } });
      needsProfile = !profile;
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ where: { userId: user.id }, include: [{ model: Department, as: 'department' }] });
    }

    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      profile, needsProfile,
    });
  } catch (err) {
    logger.error('verifyOTP error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// PASSWORD LOGIN (staff)
exports.passwordLogin = async (req, res) => {
  try {
    const mobile   = String(req.body.mobile   || '').trim();
    const password = String(req.body.password || '').trim();
    if (!mobile || !password)
      return res.status(400).json({ success: false, message: 'Mobile and password required' });

    const user = await User.findOne({ where: { mobile } });
    if (!user || !user.isActive || !user.password)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!await user.validatePassword(password))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user);

    let profile = null;
    if (user.role === 'doctor') {
      profile = await Doctor.findOne({
        where: { userId: user.id },
        include: [{ model: User, as: 'user', attributes: ['id','name','mobile','email'] }, { model: Department, as: 'department' }],
      });
    }
    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      profile,
    });
  } catch (err) {
    logger.error('passwordLogin error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// GET ME
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password','otp','otpExpiry'] } });
    let profile = null;
    if (user.role === 'patient') profile = await Patient.findOne({ where: { userId: user.id } });
    else if (user.role === 'doctor') profile = await Doctor.findOne({ where: { userId: user.id }, include: [{ model: Department, as: 'department' }] });
    res.json({ success: true, user, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// COMPLETE PROFILE
exports.completePatientProfile = async (req, res) => {
  try {
    const { name, age, dateOfBirth, gender, bloodGroup, address, emergencyContact, emergencyContactName, existingConditions, email } = req.body;
    if (name) await req.user.update({ name, email: email || req.user.email });
    const count = await Patient.count();
    const patientId = `PAT-${String(count + 1).padStart(6, '0')}`;
    const [profile, created] = await Patient.findOrCreate({
      where: { userId: req.user.id },
      defaults: { id: uuidv4(), userId: req.user.id, age: age||null, dateOfBirth: dateOfBirth||null, gender: gender||'other', bloodGroup: bloodGroup||null, address: address||null, emergencyContact: emergencyContact||null, emergencyContactName: emergencyContactName||null, existingConditions: existingConditions||null, patientId },
    });
    if (!created) await profile.update({ age, dateOfBirth, gender: gender||profile.gender, bloodGroup, address, emergencyContact, emergencyContactName, existingConditions });
    res.json({ success: true, message: 'Profile saved', profile });
  } catch (err) {
    logger.error('completePatientProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to save profile: ' + err.message });
  }
};
