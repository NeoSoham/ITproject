import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary';


// Initialize Stripe


// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for missing data
    if (!name || !email || !password) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'Please enter a valid email' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.json({ success: false, message: 'Please enter a strong password' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    // eslint-disable-next-line no-undef
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: 'User does not exist' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile data
const getProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId).select('-password');
    res.json({ success: true, userData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: 'Data Missing' });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: address ? JSON.parse(address) : undefined,
      dob,
      gender
    });

    if (imageFile) {
      const uploadResult = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' });
      await userModel.findByIdAndUpdate(userId, { image: uploadResult.secure_url });
    }

    res.json({ success: true, message: 'Profile Updated' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body;
    const doctor = await doctorModel.findById(docId).select('-password');
    if (!doctor.available) {
      return res.json({ success: false, message: 'Doctor Not Available' });
    }

    const slots = doctor.slots_booked || {};
    if (!slots[slotDate]) slots[slotDate] = [];
    if (slots[slotDate].includes(slotTime)) {
      return res.json({ success: false, message: 'Slot Not Available' });
    }
    slots[slotDate].push(slotTime);

    const user = await userModel.findById(userId).select('-password');

    const appointmentData = {
      userId,
      docId,
      userData: user,
      docData: doctor,
      amount: doctor.fees,
      slotTime,
      slotDate,
      date: Date.now()
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();
    await doctorModel.findByIdAndUpdate(docId, { slots_booked: slots });

    res.json({ success: true, message: 'Appointment Booked' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.userId.toString() !== userId) {
      return res.json({ success: false, message: 'Unauthorized action' });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    const { docId, slotDate, slotTime } = appointment;
    const doctor = await doctorModel.findById(docId);
    const slots = doctor.slots_booked || {};
    slots[slotDate] = slots[slotDate].filter(slot => slot !== slotTime);
    await doctorModel.findByIdAndUpdate(docId, { slots_booked: slots });

    res.json({ success: true, message: 'Appointment Cancelled' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to list user appointments
const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body;
    const appointments = await appointmentModel.find({ userId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { origin } = req.headers;
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment || appointment.cancelled) {
      return res.json({ success: false, message: 'Appointment Cancelled or not found' });
    }

    const currency = process.env.CURRENCY.toLowerCase();
    const line_items = [{
      price_data: {
        currency,
        product_data: { name: 'Appointment Fees' },
        unit_amount: appointment.amount * 100
      },
      quantity: 1
    }];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&appointmentId=${appointment._id}`,
      cancel_url:  `${origin}/verify?success=false&appointmentId=${appointment._id}`,
      line_items,
      mode: 'payment'
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to verify payment of appointment using Stripe
const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success } = req.body;
    if (success === 'true') {
      await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
      return res.json({ success: true, message: 'Payment Successful' });
    }
    res.json({ success: false, message: 'Payment Failed' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentStripe,
  verifyStripe
};
