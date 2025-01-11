import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import axios from "axios";
import moment from "moment";
import flash from "connect-flash";
import GoogleStrategy from "passport-google-oauth2";
// Firebase Related import
import { auth, db } from "./config/firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { OAuth2Client } from "google-auth-library";
//AdminJS Related Imports
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Sequelize } from 'sequelize';
import AdminJSSequelize from '@adminjs/sequelize';
// import UserModel from './models/user.entity.js';
import { DataTypes } from 'sequelize';
// import { pool } from './db'; // Assuming you are using pool from pg package

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize Sequelize
// const sequelize = new Sequelize({
//   dialect: 'postgres',
//   username: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
// });



// AdminJS.registerAdapter(AdminJSSequelize);


// const UserModel = sequelize.define(
//   'User',
//   {
//     user_id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     username: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     password: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     role: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       defaultValue: 'user', // Default role
//     },
//   },
//   {
//     tableName: 'users', // Map this model to your `users` table
//     timestamps: false,  // Disable timestamps if they are not in the table
//   }
// );


// // Initialize AdminJS
// const adminJS = new AdminJS({
//   databases: [sequelize],  // Pass your sequelize instance
//   rootPath: '/admin',  // Set custom admin path
//   // resources: [{
//   //   resource: UserModel,  // Your user Sequelize model
//   //   options: {
//   //     actions: {
//   //       edit: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //       delete: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //       new: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //     },
//   //   },
//   // }],
//   branding: {
//     companyName: 'ETConnect',  // Custom branding (optional)
//   },
// });

// const router = AdminJSExpress.buildRouter(adminJS);

// // Use AdminJS routes
// app.use(adminJS.options.rootPath, router);

// app.use('/admin', (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect('/login');  // redirect if not authenticated
//   }
  
//   // Assuming user role is stored in req.user
//   if (req.user.role !== 'superadmin') {
//     return res.status(403).send('Forbidden');  // Send 403 for non-admin users
//   }
  
//   next();  // Continue to the AdminJS route
// });


// app.use('/admin', (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect('/login');  // Redirect unauthenticated users to login
//   }
  
//   if (req.user.role !== 'superadmin') {
//     return res.status(403).send('Forbidden');  // Block non-superadmin users
//   }
  
//   next();  // Allow access for superadmin
// });


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to format dates
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

app.use(async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Query to get all bookings in the next 30 days
    const bookingsResult = await pool.query(
      `SELECT booking_id, date
       FROM bookings
       WHERE date >= $1 AND date <= $2`,
      [today, thirtyDaysLater]
    );

    const upcomingBookings = bookingsResult.rows;

    // Initialize an object to track time slots for each day
    const timeSlotsCount = {};

    // Loop through the bookings and get the time slots for each booking
    for (const booking of upcomingBookings) {
      const bookingId = booking.booking_id;
      const bookingDate = booking.date;

      // Query to get time slots for this booking
      const timeSlotsResult = await pool.query(
        `SELECT timeslot FROM timeslots
         WHERE booking_id = $1`,
        [bookingId]
      );

      // Count time slots for this booking and day
      const timeSlotsForThisBooking = timeSlotsResult.rows.length;
      const formattedDate = formatDate(new Date(bookingDate));

      if (!timeSlotsCount[formattedDate]) {
        timeSlotsCount[formattedDate] = 0;
      }

      timeSlotsCount[formattedDate] += timeSlotsForThisBooking;
    }

    // Filter days with more than 10 time slots
    const datesWithTooManyTimeSlots = [];
    for (const date in timeSlotsCount) {
      if (timeSlotsCount[date] >= 20) {
        datesWithTooManyTimeSlots.push(date);
      }
    }

    // Make data available to all templates
    res.locals.datesWithTooManyTimeSlots = datesWithTooManyTimeSlots;
    res.locals.user = req.isAuthenticated() ? req.user : null;

    next();
  } catch (err) {
    console.error('Error fetching data:', err);
    next(err); // Pass the error to the next middleware
  }
});

app.get("/", async (req, res) => {
  res.render("index.ejs", { messages: req.flash('error') });
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { messages: req.flash('error')});
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/confirmation", async (req, res) => {
  res.render("confirmation.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    // Check if the email already exists in Firestore
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (!userQuerySnapshot.empty) {
      res.render("register.ejs", { errorMessage: "Email already exists. Try logging in." });
    } else {
      // Hash the password using bcrypt
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          // Save the user to Firestore
          await addDoc(collection(db, "users"), {
            email: email,
            password: hash,  // Store the hashed password
            role: "user",     // Default role, can be modified as needed
            createdAt: new Date(),
          });

          res.render("login.ejs");
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.render("register.ejs", { errorMessage: "An error occurred. Please try again." });
  }
});


app.post("/login", passport.authenticate("local", {
  successRedirect: '/',  // Redirect to the landing page on success
  failureRedirect: '/login',  // Redirect to login page on failure
  failureFlash: true  // Enable flash messages on failure
})
);


passport.use("local", 
  new Strategy(async function verify(username, password, cb) {
    try {
      // Query Firestore for the user by username
      const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", username)));

      if (!userQuerySnapshot.empty) {
        const user = userQuerySnapshot.docs[0].data();  // Get the first document (user)
        const storedHashedPassword = user.password;     // The hashed password from Firestore

        // Compare provided password with stored hashed password
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            // Error comparing passwords
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              // Password matches
              if (user.role === 'superadmin') {
                return cb(null, user, { message: 'Redirecting to AdminJS...' });  // For superadmin
              } else {
                return cb(null, user);  // For other roles
              }
            } else {
              // Password doesn't match
              return cb(null, false, { message: 'Incorrect username or password.' });
            }
          }
        });
      } else {
        // User not found in Firestore
        return cb(null, false, { message: 'User not found, please sign up first.' });
      }
    } catch (err) {
      console.error("Error in local strategy:", err);
      return cb(err);
    }
  })
);

passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://your-app-url.com/auth/google/callback",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.emails[0].value;

    // Check if the user exists in Firestore
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (userQuerySnapshot.empty) {
      // If the user doesn't exist, create a new user
      await addDoc(collection(db, "users"), {
        email: email,
        password: "google",  // Assign a default password (you may not need this)
        role: "user",        // Default role can be changed
        createdAt: new Date(),
      });
    }

    return cb(null, { email: email, role: "user" }); // Return user object for passport

  } catch (err) {
    console.log(err);
    return cb(err);
  }
}));

// app.get("/bookinglist", async (req, res) => {
//   const currentDate = moment().format("YYYY-MM-DD");
//   const currentTime = moment().format("HH:mm:ss");
//   const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD"); // Date 30 days ago

//   const upcomingQuery = `
//     SELECT 
//       b.booking_id, 
//       u.username, 
//       b.date, 
//       b.start_time, 
//       b.end_time, 
//       b.description, 
//       b.attendees, 
//       DATE(b.created_at) AS booking_date
//     FROM bookings b
//     JOIN users u ON b.user_id = u.user_id
//     WHERE 
//       (b.date > $1) OR 
//       (b.date = $1 AND b.end_time > $2)
//     ORDER BY b.date, b.start_time
//   `;

//   const pastQuery = `
//     SELECT 
//       b.booking_id, 
//       u.username, 
//       b.date, 
//       b.start_time, 
//       b.end_time, 
//       b.description, 
//       b.attendees, 
//       DATE(b.created_at) AS booking_date
//     FROM bookings b
//     JOIN users u ON b.user_id = u.user_id
//     WHERE 
//       (
//         (b.date < $1 AND b.date >= $3) OR 
//         (b.date = $1 AND b.end_time <= $2)
//       )
//     ORDER BY b.date DESC, b.start_time DESC
//   `;

//   try {
//     const upcomingResult = await pool.query(upcomingQuery, [currentDate, currentTime]);
//     const pastResult = await pool.query(pastQuery, [currentDate, currentTime, pastLimitDate]);

//     const formatBookings = (rows) =>
//       rows.map(row => ({
//         booking_id: row.booking_id,
//         username: row.username,
//         date: moment(row.date).format("DD-MM-YYYY"),
//         start_time: row.start_time,
//         end_time: row.end_time,
//         description: row.description,
//         attendees: row.attendees,
//         booking_date: moment(row.booking_date).format("DD-MM-YYYY"),
//       }));

//     const upcomingBookings = formatBookings(upcomingResult.rows);
//     const pastBookings = formatBookings(pastResult.rows);

//     res.render("bookinglist.ejs", { upcomingBookings, pastBookings });
//   } catch (err) {
//     console.error("Error retrieving bookings:", err);
//     res.status(500).send("Error retrieving bookings.");
//   }
// });

// app.get("/mybookings", async (req, res) => {
//   if (req.isAuthenticated()) {
//     const currentDate = moment().format("YYYY-MM-DD");
//     const currentTime = moment().format("HH:mm:ss");

//     // Retrieve the user_id of the currently logged-in user
//     const userId = req.user.user_id;

//     const upcomingQuery = `
//       SELECT 
//         b.booking_id, 
//         u.username, 
//         b.date, 
//         b.start_time, 
//         b.end_time, 
//         b.description, 
//         b.attendees, 
//         DATE(b.created_at) AS booking_date
//       FROM bookings b
//       JOIN users u ON b.user_id = u.user_id
//       WHERE 
//         b.user_id = $1 AND
//         b.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 DAYS'
//       ORDER BY b.date, b.start_time
//     `;

//     const pastQuery = `
//       SELECT 
//         b.booking_id, 
//         u.username, 
//         b.date, 
//         b.start_time, 
//         b.end_time, 
//         b.description, 
//         b.attendees, 
//         DATE(b.created_at) AS booking_date
//       FROM bookings b
//       JOIN users u ON b.user_id = u.user_id
//       WHERE 
//         b.user_id = $1 AND
//         b.date BETWEEN CURRENT_DATE - INTERVAL '90 DAYS' AND CURRENT_DATE
//       ORDER BY b.date DESC, b.start_time DESC
//     `;

//     try {
//       const upcomingResult = await pool.query(upcomingQuery, [userId]);
//       const pastResult = await pool.query(pastQuery, [userId]);

//       const formatBookings = (rows) =>
//         rows.map(row => ({
//           booking_id: row.booking_id,
//           username: row.username,
//           date: moment(row.date).format("DD-MM-YYYY"),
//           start_time: row.start_time,
//           end_time: row.end_time,
//           description: row.description,
//           attendees: row.attendees,
//           booking_date: moment(row.booking_date).format("DD-MM-YYYY"),
//         }));

//       const upcomingMyBookings = formatBookings(upcomingResult.rows);
//       const pastMyBookings = formatBookings(pastResult.rows);

//       res.render("mybookings.ejs", { upcomingMyBookings, pastMyBookings });
//     } catch (err) {
//       console.error("Error retrieving your bookings:", err);
//       res.status(500).send("Error retrieving your bookings.");
//     }
//   } else {
//     res.redirect("/login");
//   }
// });

// app.get('/edit-booking/:id', async (req, res) => {
//   if (req.isAuthenticated()) {
//   const booking_id = req.params.id;

//   try {
//     // Query only the specific booking by booking_id
//     const result = await pool.query('SELECT * FROM bookings WHERE booking_id = $1', [booking_id]);

//     if (result.rows.length === 0) {
//       return res.status(404).send('Booking not found');
//     }

//     // Use the booking data as needed
//     const booking = result.rows[0];

//     // Format the date to DD-MM-YYYY
//     booking.date = moment(booking.date).format('DD-MM-YYYY');
//     booking.start_time = moment(booking.start_time, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed
//     booking.end_time = moment(booking.end_time, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed

//     res.render('editBookings.ejs', { booking });
//   } catch (error) {
//     console.error('Error fetching booking:', error);
//     res.status(500).send('Server error');
//   }
// } else {
//   res.redirect("/login");
// }
// });

app.post('/next', async (req, res) => {
  const { date } = req.body; // selectedDate from frontend

  // Reformat date to YYYY-MM-DD format
  const [day, month, year] = date.split('-');
  const formattedDate = `${year}-${month}-${day}`;

  try {
    // Step 1: Query the bookings collection to get bookings for the selected date
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("date", "==", formattedDate));
    const bookingsSnapshot = await getDocs(bookingsQuery);

    // If no bookings found, send an empty response
    if (bookingsSnapshot.empty) {
      return res.json({ timeslots: [], end_times: [], start_times: [], booking_ids: [] });
    }

    // Step 2: Extract booking data
    const bookings = [];
    bookingsSnapshot.forEach(doc => {
      bookings.push({ id: doc.id, ...doc.data() });
    });

    // Step 3: Calculate timeslots dynamically
    const timeslots = []; // Array to store calculated timeslots
    const endTimes = [];
    const startTimes = [];
    const bookingIds = [];

    bookings.forEach((booking, index) => {
      const { starttime, endtime } = booking; // Assuming starttime and endtime are strings like "09:30" and "10:30"
      
      console.log(`Booking #${index + 1}:`);
      console.log(`Start Time: ${starttime}`);
      console.log(`End Time: ${endtime}`);

      // let currentTime = new Date(`1970-01-01T${starttime}:00`); // Convert starttime to a Date object
      // const endTime = new Date(`1970-01-01T${endtime}:00`); // Convert endtime to a Date object

      // Create valid date objects from starttime and endtime
      const startParts = starttime.split(":");
      const endParts = endtime.split(":");

      // Use a fixed date (e.g., "1970-01-01") and add hours and minutes
      const startDateTime = new Date(1970, 0, 1, parseInt(startParts[0]), parseInt(startParts[1]));
      const endDateTime = new Date(1970, 0, 1, parseInt(endParts[0]), parseInt(endParts[1]));

      console.log("Start Time:", startDateTime);
      console.log("End Time:", endDateTime);

      let currentTime = startDateTime;
      // Generate timeslots, but exclude the endtime
      while (currentTime < endDateTime) {
        // Format the current time as "HH:mm" and add it to the timeslots array
        const slot = currentTime.toTimeString().substring(0, 5); // Get "HH:mm"
        timeslots.push(slot);

        console.log(`Added Timeslot: ${slot}`);

        // Increment the current time by 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + 15);

        console.log(`Current Time (after increment): ${currentTime}`);
      }

      endTimes.push(endtime); // Add endtime to the list
      startTimes.push(starttime); // Add starttime to the list
      bookingIds.push(booking.id); // Add booking_id to the list
    });

    // Step 4: Send the calculated timeslots, start_times, and end_times to the frontend
    console.log(`Final Timeslots: ${timeslots}`);
    res.json({ timeslots, end_times: endTimes, start_times: startTimes, booking_ids: bookingIds });
  } catch (error) {
    console.error('Error fetching timeslots and end_times:', error);
    res.status(500).send('Error fetching timeslots and end_times');
  }
});

app.post('/submit', async (req, res) => {
  if (req.isAuthenticated()) {
    let { attendees, date, start, end, purpose } = req.body;
    attendees = attendees || 2; // Default attendees
    purpose = purpose || 'Not Stated'; // Default purpose

    // Reformat the date
    const [day, month, year] = date.split('-');
    const formattedDate = `${year}-${month}-${day}`;

    try {
      // Step 1: Insert booking details into Firestore
      const bookingData = {
        user_id: req.user.uid, // Use the authenticated user's UID
        name: req.user.name || "Anonymous", // Add user's name if available
        email: req.user.email, // Add user's email
        date: formattedDate,
        starttime: start,
        endtime: end,
        des: purpose,
        attendees: attendees,
        created_at: new Date().toISOString(), // Use ISO format for created_at
        room_id: null, // Optional: Add a room ID if needed
        room_name: null, // Optional: Add a room name if needed
      };

      // Add the booking data to the "bookings" collection
      const bookingRef = await addDoc(collection(db, "bookings"), bookingData);

      // Step 2: Generate timeslots and store them in Firestore (if needed)
      const timeslots = [];
      let startTime = new Date(`1970-01-01T${start}`); // Convert start time to Date object
      let endTime = new Date(`1970-01-01T${end}`); // Convert end time to Date object

      while (startTime < endTime) {
        const slotTime = startTime.toTimeString().substring(0, 5); // Format to "HH:mm"
        timeslots.push(slotTime);

        // Increment time by 30 minutes
        startTime.setMinutes(startTime.getMinutes() + 30);
      }

      // Optionally, add the timeslots to Firestore (e.g., subcollection or separate document)
      await setDoc(doc(db, "bookings", bookingRef.id), {
        ...bookingData,
        timeslots, // Add the generated timeslots
      });

      // Step 3: Prepare data for the confirmation page
      const queryParams = new URLSearchParams({
        id: bookingRef.id,
        date: formattedDate,
        startTime: start,
        endTime: end,
        attendees: attendees,
        purpose: purpose,
      }).toString();

      // Redirect to confirmation page with booking data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.redirect(`/confirmation?${queryParams}`);
    } catch (error) {
      console.error('Error saving booking:', error);
      res.status(500).send('Error saving booking');
    }
  } else {
    res.redirect('/login');
  }
});


// app.get('/calendarPage', async (req, res) => {
//   const currentDate = moment().format("YYYY-MM-DD");
//   const currentTime = moment().format("HH:mm:ss");
//   const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD"); // Date 30 days ago

//   const upcomingQuery = `
//     SELECT 
//       b.booking_id, 
//       u.username, 
//       b.date, 
//       b.start_time, 
//       b.end_time, 
//       b.description, 
//       b.attendees, 
//       DATE(b.created_at) AS booking_date
//     FROM bookings b
//     JOIN users u ON b.user_id = u.user_id
//     WHERE 
//       (b.date > $1) OR 
//       (b.date = $1 AND b.end_time > $2)
//     ORDER BY b.date, b.start_time
//   `;

//   const pastQuery = `
//     SELECT 
//       b.booking_id, 
//       u.username, 
//       b.date, 
//       b.start_time, 
//       b.end_time, 
//       b.description, 
//       b.attendees, 
//       DATE(b.created_at) AS booking_date
//     FROM bookings b
//     JOIN users u ON b.user_id = u.user_id
//     WHERE 
//       (
//         (b.date < $1 AND b.date >= $3) OR 
//         (b.date = $1 AND b.end_time <= $2)
//       )
//     ORDER BY b.date DESC, b.start_time DESC
//   `;

//   try {
//     const upcomingResult = await pool.query(upcomingQuery, [currentDate, currentTime]);
//     const pastResult = await pool.query(pastQuery, [currentDate, currentTime, pastLimitDate]);

//     const formatBookings = (rows) =>
//       rows.map(row => ({
//         booking_id: row.booking_id,
//         username: row.username,
//         date: moment(row.date).format("DD-MM-YYYY"),
//         start_time: row.start_time,
//         end_time: row.end_time,
//         description: row.description,
//         attendees: row.attendees,
//         booking_date: moment(row.booking_date).format("DD-MM-YYYY"),
//       }));

//     const upcomingBookings = formatBookings(upcomingResult.rows);
//     const pastBookings = formatBookings(pastResult.rows);

//     // Render calendar.ejs and pass the bookings as JSON
//     res.render('calendar.ejs',{ upcomingBookings, pastBookings });
//   } catch (err) {
//     console.error("Error retrieving bookings:", err);
//     res.status(500).send("Error retrieving bookings.");
//   }
// });

// app.post('/edit', async (req, res) => {
//   if (req.isAuthenticated()) {
//     // Extract bookingId and other fields from the form submission
//     const { bookingId, attendees, date, start, end, purpose } = req.body;

//     // Set default values if attendees or purpose are not provided
//     const updatedAttendees = attendees || 2;
//     const updatedPurpose = purpose || 'Not Stated';

//     // Reformat date and convert times to 24-hour format
//     const [day, month, year] = date.split('-');
//     const formattedDate = `${year}-${month}-${day}`;

//     try {
//       // Step 1: Update the booking details in the bookings table
//       await pool.query(
//         `UPDATE bookings
//          SET date = $1, start_time = $2, end_time = $3, description = $4, attendees = $5, created_at = NOW()
//          WHERE booking_id = $6`,
//         [formattedDate, start, end, updatedPurpose, updatedAttendees, bookingId]
//       );

//       // Step 2: Remove existing timeslots for the booking
//       await pool.query(
//         `DELETE FROM timeslots
//          WHERE booking_id = $1`,
//         [bookingId]
//       );

//       // Step 3: Generate and insert new timeslots
//       const timeslots = [];
//       let startTime = new Date(`1970-01-01T${start}`); // Convert to Date object
//       let endTime = new Date(`1970-01-01T${end}`);     // Convert to Date object

//       while (startTime < endTime) {
//         const slotTime = startTime.toTimeString().substring(0, 5);
//         timeslots.push(slotTime);

//         // Insert each new timeslot into the timeslots table
//         await pool.query(
//           `INSERT INTO timeslots (booking_id, timeslot)
//            VALUES ($1, $2)`,
//           [bookingId, slotTime]
//         );

//         // Increment the start time by 1 hour
//         startTime.setMinutes(startTime.getMinutes() + 30);
//       }

//       res.render('confirmation.ejs', {
//         booking: {
//           id: bookingId,
//           date: `${day}-${month}-${year}`, // Reformat for display
//           startTime: start,
//           endTime: end,
//           attendees: updatedAttendees,
//           purpose: updatedPurpose,
//         },
//         timeslots,
//       });
//     } catch (error) {
//       console.error('Error updating booking:', error);
//       res.status(500).send('Error updating booking');
//     }
//   } else {
//     res.redirect('/login');
//   }
// });

// app.get('/delete/:id', async (req, res) => {
//   if (req.isAuthenticated()) {
//     const bookingId = req.params.id; // Extract bookingId from the form

//     try {
//       // Step 1: Delete timeslots associated with the booking
//       await pool.query(
//         `DELETE FROM timeslots
//          WHERE booking_id = $1`,
//         [bookingId]
//       );

//       // Step 2: Delete the booking itself
//       await pool.query(
//         `DELETE FROM bookings
//          WHERE booking_id = $1`,
//         [bookingId]
//       );

//       res.render('delete-confirmation.ejs', {
//         bookingId,
//       });
//     } catch (error) {
//       console.error('Error deleting booking:', error);
//       res.status(500).send('Error deleting booking');
//     }
//   } else {
//     res.redirect('/login');
//   }
// });

// app.get('delete-confirmation', (req, res) => {
//   res.render('delete-confirmation.ejs');
// });


passport.serializeUser((user, cb) => {
  cb(null, user.uid); // Serialize user_id to session
});

passport.deserializeUser(async (id, cb) => {
  try {
    const q = query(collection(db, "users"), where("uid", "==", id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      cb(null, querySnapshot.docs[0].data());
    } else {
      cb(new Error("User not found"));
    }    
  } catch (err) {
    cb(err);
  }
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});


//added a comment for github activeness