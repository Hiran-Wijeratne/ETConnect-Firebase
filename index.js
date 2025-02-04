import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import moment from "moment";
import flash from "connect-flash";
import GoogleStrategy from "passport-google-oauth2";
import nodemailer from 'nodemailer';
import emailValidator from 'email-validator'; // Ensure to install email-validator
// Firebase Related Import
import {db} from "./public/config/firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch
} from "firebase/firestore";


// import UserModel from './models/user.entity.js';
import { DataTypes } from 'sequelize';







const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

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

app.use((req, res, next) => {
  res.locals.errorMessage = req.flash("error"); // Pass error messages to views
  next();
});


// Set up Nodemailer transporter using SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // The SMTP host for your email provider
  port: 587, // SMTP port (587 is usually for TLS, 465 for SSL, 25 is a non-secure option)
  secure: false, // Set to true if using SSL
  auth: {
    user: 'tp.bookingapp@gmail.com', // Your email address
    pass: 'jyec lqrq aukz xrxc',   // Your email password or app-specific password
  },
  tls: {
    rejectUnauthorized: false,  // This is to prevent errors in some cases (optional)
  }
});










///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///Admin Panel Related Code


//Admin Rooom Management Backend Routes
app.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
  const email = req.session.email || null;
  const currentDate = moment().format('DD/MM/YYYY'); // Format date using moment
  res.render("dashboard.ejs", { currentDate, email });
} else {
  res.redirect("/login");
}
});

app.get("/room", async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    // Get a reference to the 'meeting_rooms' collection
    const email = req.session.email || null;
    const roomsCollectionRef = collection(db, "meeting_rooms");

    // Get the documents from the collection
    const snapshot = await getDocs(roomsCollectionRef);

    // If no rooms are found, handle the case
    if (snapshot.empty) {
      return res.status(404).send("No rooms found");
    }

    // Map the snapshot to an array of room objects
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id, // Firestore document ID
      ...doc.data() // Get the data of the document
    }));

    // Pass the rooms data to the EJS template
    res.render("room.ejs", { rooms, email });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving rooms data.");
  }
} else {
  res.redirect("/login");
}
});

app.post('/update-room/:roomId', async (req, res) => {
  const { roomId } = req.params; // Get roomId from the URL parameter
  const { roomName, capacity, facilities, availability } = req.body;
  console.log(availability);

  try {
    // Convert availability to boolean
    const isAvailable = availability === "true" ? true : false;
    const numericCapacity = Number(capacity);

    const roomRef = doc(db, "meeting_rooms", roomId);
    await updateDoc(roomRef, {
      name: roomName,
      capacity: numericCapacity,
      facilities: facilities || "Nil",
      available: isAvailable, // Store boolean value
    });

    res.redirect("/room");
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).send("Error updating room");
  }
});

app.post("/create-room", async (req, res) => {
  const { roomName, capacity, facilities, availability } = req.body;

  try {
    // Convert availability to boolean
    const isAvailable = availability === "true" ? true : false;
    const numericCapacity = Number(capacity);

    // Add the new room to the Firestore collection
    const newRoom = {
      name: roomName,
      capacity: numericCapacity,
      facilities: facilities || "Nil", // Default to "None" if no facilities provided
      available: isAvailable,
    };

    // Get a reference to the 'meeting_rooms' collection and add the new document
    await addDoc(collection(db, "meeting_rooms"), newRoom);

    // Redirect to the room management page after successfully creating the room
    res.redirect("/room");
  } catch (error) {
    console.error("Error creating new room:", error);
    res.status(500).send("Error creating room");
  }
});

app.delete("/rooms/:id", async (req, res) => {
  const roomId = req.params.id;
  console.log("Server received room ID for deletion:", roomId); // Debugging log

  try {
    // Reference to the room document
    const roomRef = doc(db, "meeting_rooms", roomId);
    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
      console.log(`Room with ID ${roomId} not found.`);
      return res.status(404).json({ error: "Room not found" });
    }

    // Query to find all bookings associated with the room
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("room_id", "==", roomId));
    const bookingsSnapshot = await getDocs(bookingsQuery);

    // Start a batch operation for cascade delete
    const batch = writeBatch(db);

    // Add deletion of associated bookings to the batch
    bookingsSnapshot.forEach((booking) => {
      const bookingRef = doc(db, "bookings", booking.id);
      batch.delete(bookingRef);
    });

    // Add deletion of the room to the batch
    batch.delete(roomRef);

    // Commit the batch operation
    await batch.commit();

    console.log(`Room with ID ${roomId} and its associated bookings deleted successfully.`);
    res.status(200).json({ message: "Room and associated bookings deleted successfully." });
  } catch (error) {
    console.error("Error during cascade delete:", error);
    res.status(500).json({ error: "Failed to delete the room and associated bookings" });
  }
});

app.delete("/rooms", async (req, res) => {
  const { roomIds } = req.body; // Expecting an array of room IDs

  if (!roomIds || roomIds.length === 0) {
    return res.status(400).json({ error: "No room IDs provided for deletion." });
  }

  try {
    // Start a batch operation
    const batch = writeBatch(db);

    for (const roomId of roomIds) {
      // Reference to the room document
      const roomRef = doc(db, "meeting_rooms", roomId);

      // Query to find all bookings associated with the room
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(bookingsRef, where("room_id", "==", roomId));
      const bookingsSnapshot = await getDocs(bookingsQuery);

      // Add deletion of associated bookings to the batch
      bookingsSnapshot.forEach((booking) => {
        const bookingRef = doc(db, "bookings", booking.id);
        batch.delete(bookingRef);
      });

      // Add deletion of the room to the batch
      batch.delete(roomRef);
    }

    // Commit the batch operation
    await batch.commit();

    console.log("Rooms and their associated bookings deleted successfully.");
    res.status(200).json({ message: "Rooms and associated bookings deleted successfully." });
  } catch (error) {
    console.error("Error during cascade delete:", error);
    res.status(500).json({ error: "Failed to delete rooms and their associated bookings" });
  }
});


///////User Management Routes
app.get("/users", async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const email = req.session.email || null;
    const errorMessage = req.query.errorMessage; 
    const usersCollectionRef = collection(db, "users");
    const snapshot = await getDocs(usersCollectionRef);

    if (snapshot.empty) {
      return res.status(404).send("No users found");
    }

    // Filter out users with role 'superadmin'
    const users = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // .filter(user => user.role !== 'superadmin'); // Exclude 'superadmin' role

    res.render("users.ejs", { users, errorMessage, email });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving users data.");
  }
} else {
  res.redirect("/login");
}
});

app.post("/update-user/:userId", async (req, res) => {
  const { userId } = req.params;
  const { email, role } = req.body;

  try {
    const userRef = doc(db, "users", userId);

    // Check if any other user has the same email
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    );
    const querySnapshot = await getDocs(usersQuery);

    let emailExists = false;
    querySnapshot.forEach((doc) => {
      // Ensure the matching email is not from the same user being updated
      if (doc.id !== userId) {
        emailExists = true;
      }
    });

    if (emailExists) {
      req.flash("error", "The updated email already exists. Please try a different email.");
      return res.redirect(`/users?errorMessage=${encodeURIComponent("The updated email already exists. Please try a different email.")}`);  
    }

    // Update the user document
    await updateDoc(userRef, {
      email: email,
      role: role,
    });

    res.redirect("/users");
  } catch (error) {
    console.error("Error updating user:", error);
    req.flash("error", "An error occurred while updating the user.");
    res.redirect("/users");
  }
});

app.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log(`User with ID ${userId} not found.`);
      return res.status(404).json({ error: "User not found" });
    }

    await deleteDoc(userRef);
    console.log(`User with ID ${userId} deleted successfully.`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete the user" });
  }
});

app.delete("/users", async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ error: "No user IDs provided for deletion." });
    }

    const batch = writeBatch(db);
    userIds.forEach((id) => {
      const userRef = doc(db, "users", id);
      batch.delete(userRef);
    });

    await batch.commit();
    res.status(200).json({ message: "Users deleted successfully." });
  } catch (error) {
    console.error("Error deleting users:", error);
    res.status(500).json({ error: "An error occurred while deleting users." });
  }
});

app.post("/create-user", async (req, res) => {
  const { userName, userEmail, userRole } = req.body;

  try {
    const newUser = {
      name: userName,
      email: userEmail,
      role: userRole,
    };

    await addDoc(collection(db, "users"), newUser);
    res.redirect("/users");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user");
  }
});


///////FeedBack Management Routes

app.get("/feedback", async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const email = req.session.email || null;
    const feedbackCollection = collection(db, "feedback");
    const feedbackSnapshot = await getDocs(feedbackCollection);

    const feedbackPending = [];
    const feedbackSolved = [];
    feedbackSnapshot.forEach((doc) => {
      const feedback = { id: doc.id, ...doc.data() };
      if (feedback.status === "pending") feedbackPending.push(feedback);
      else feedbackSolved.push(feedback);
    });

    res.render("feedback.ejs", { feedbackPending, feedbackSolved, email });
  } catch (error) {
    res.status(500).send("Error fetching feedback: " + error.message);
  }
} else {
  res.redirect("/login");
}
});

app.post("/add-feedback", async (req, res) => {
  try {
    const { name, email, description } = req.body;
    const newFeedbackRef = doc(collection(db, "feedback"));
    await setDoc(newFeedbackRef, {
      name,
      email,
      description,
      status: "pending",
    });
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Error adding feedback: " + error.message);
  }
});

app.post("/update-feedback", async (req, res) => {
  try {
    const { id, description, status } = req.body;
    const feedbackRef = doc(db, "feedback", id);
    await updateDoc(feedbackRef, { description, status });
    res.redirect("/feedback");
  } catch (error) {
    res.status(500).send("Error updating feedback: " + error.message);
  }
});

app.post("/delete-feedback", async (req, res) => {
  try {
    const { id } = req.body;
    const feedbackRef = doc(db, "feedback", id);
    await deleteDoc(feedbackRef);
    res.redirect("/feedback");
  } catch (error) {
    res.status(500).send("Error deleting feedback: " + error.message);
  }
});

app.post("/delete-selected-feedback", async (req, res) => {
  try {
    // Split the comma-separated string into an array
    const selectedFeedbackIds = (req.body.selectedFeedbackIds || "").split(",");

    // Validate the input: ensure all IDs are non-empty
    const validIds = selectedFeedbackIds.filter(id => id.trim() !== "");

    for (const id of validIds) {
      const feedbackRef = doc(db, "feedback", id);
      await deleteDoc(feedbackRef);
    }

    res.redirect("/feedback");
  } catch (error) {
    console.error("Error deleting selected feedback:", error);
    res.status(500).send("Error deleting selected feedback: " + error.message);
  }
});

app.post("/change-password", async (req, res) => {
  if (req.isAuthenticated()) {
    const email = req.session.email;
  const currentDate = moment().format('DD/MM/YYYY'); 
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Check if the new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.render("dashboard.ejs", { errorMessage: "New passwords do not match.", email, currentDate });
  }

  try {
    // Get the user's email from the session
    // const email = req.session.email;
    if (!email) {
      return res.render("dashboard.ejs", { errorMessage: "User not authenticated." });
    }

    // Query Firestore for the user by email
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (!userQuerySnapshot.empty) {
      const userDoc = userQuerySnapshot.docs[0]; // Get the first document (user)
      const userData = userDoc.data();
      const storedHashedPassword = userData.password; // Hashed password from Firestore

      // Compare current password with the stored hashed password
      const isMatch = await bcrypt.compare(currentPassword, storedHashedPassword);
      if (!isMatch) {
        return res.render("dashboard.ejs", { errorMessage: "Current password is incorrect.", email, currentDate });
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update the password in Firestore
      const userRef = doc(db, "users", userDoc.id); // Reference to the user document
      await updateDoc(userRef, { password: hashedNewPassword });

      // Respond with success
      return res.render("dashboard.ejs", { successMessage: "Password updated successfully!" , email, currentDate});
    } else {
      return res.render("dashboard.ejs", { errorMessage: "User not found.",email, currentDate });
    }
  } catch (err) {
    console.error("Error changing password:", err);
    return res.render("dashboard.ejs", { errorMessage: "An error occurred. Please try again." , email, currentDate});
  }
} else {
  res.redirect("/login");
}
});


/////////Booking Management Routes
app.get('/bookings', async (req, res) => {
    if (req.isAuthenticated()) {
      try {
        // Get the email from session (or you can use another auth method)
        const email = req.session.email || null;
  
        // Get reference to the 'bookings' collection in Firestore
        const bookingsCollectionRef = collection(db, 'bookings');
  
        // Fetch the bookings documents from Firestore
        const snapshot = await getDocs(bookingsCollectionRef);
  
        // If no bookings are found, return a 404 response
        if (snapshot.empty) {
          return res.status(404).send("No bookings found");
        }
  
        // Map the snapshot to an array of booking objects
        const bookings = snapshot.docs.map(doc => ({
          id: doc.id, // Firestore document ID
          ...doc.data() // Firestore document data
        }));
  
        // Render the booking data to the EJS template (or send it as a response)
        res.render('bookings.ejs', { bookings, email }); // Rendering the bookings page
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving bookings data.");
      }
    } else {
      // Redirect to login if user is not authenticated
      res.redirect('/login');
    }
  });

app.delete("/deleteBooking/:id", async (req, res) => {
    const bookingId = req.params.id;
  
    try {
      // Get reference to the specific booking document
      const bookingRef = doc(db, "bookings", bookingId);
      const bookingDoc = await getDoc(bookingRef);
  
      // If the booking doesn't exist, return an error
      if (!bookingDoc.exists()) {
        console.log(`Booking with ID ${bookingId} not found.`);
        return res.status(404).json({ error: "Booking not found" });
      }
  
      // Delete the booking document from Firestore
      await deleteDoc(bookingRef);
      console.log(`Booking with ID ${bookingId} deleted successfully.`);
      res.status(200).json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ error: "Failed to delete the booking" });
    }
  });

// Bulk delete bookings (handling each booking deletion individually)
app.delete("/bulkbookingsdelete", async (req, res) => {
  try {
    const { bookingIds } = req.body; // Extract the bookingIds from the request body

    // Check if bookingIds is provided and contains elements
    if (!bookingIds || bookingIds.length === 0) {
      return res.status(400).json({ error: "No booking IDs provided for deletion." });
    }

    // Iterate over the bookingIds and delete each one
    for (const bookingId of bookingIds) {
      const bookingRef = doc(db, "bookings", bookingId);
      await deleteDoc(bookingRef);
    }

    res.status(200).json({ message: "Bookings deleted successfully." });
  } catch (error) {
    console.error("Error deleting bookings:", error);
    res.status(500).json({ error: "An error occurred while deleting bookings." });
  }
});




//////////Unavailable Date Management Routes
app.get('/unavailable-dates', async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const email = req.session.email || null;
    const snapshot = await getDocs(collection(db, 'unavailable_dates'));
    const unavailableDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.render('unavailableDates.ejs', { unavailableDates, email });
  } catch (error) {
    console.error("Error fetching unavailable dates:", error);
    res.status(500).json({ error: "An error occurred while fetching unavailable dates." });
  }
} else {
  // Redirect to login if user is not authenticated
  res.redirect('/login');
}
});

app.delete("/unavailable_dates/:id", async (req, res) => {
  const { id } = req.params; // Date ID passed in URL

  try {
    // Reference to the "unavailable_dates" document
    const unavailableDateRef = doc(db, "unavailable_dates", id);

    // Delete the document
    await deleteDoc(unavailableDateRef);

    res.status(200).json({ message: "Date deleted successfully" });
  } catch (err) {
    console.error("Error deleting date:", err);
    res.status(500).json({ error: "Unable to delete the date" });
  }
});

// Bulk delete route
app.delete("/unavailable_dates_bulk", async (req, res) => {
  const { dateIds } = req.body;  // Get the comma-separated list of date IDs from the request body
  const dateIdArray = dateIds.split(',');  // Split the string into an array

  if (!Array.isArray(dateIdArray) || dateIdArray.length === 0) {
    return res.status(400).json({ error: "No date IDs provided for deletion." });
  }

  try {
    // Delete dates in parallel
    const deletePromises = dateIdArray.map(async (dateId) => {
      const dateRef = doc(db, "unavailable_dates", dateId);
      await deleteDoc(dateRef);  // Delete each date from Firestore
    });

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    res.status(200).json({ message: `${dateIdArray.length} dates deleted successfully.` });
  } catch (err) {
    console.error("Error deleting dates:", err);
    res.status(500).json({ error: "An error occurred while deleting the dates." });
  }
});

// PUT route to update an unavailable date (for the edit functionality)
app.post("/unavailable-date/:id", async (req, res) => {
  const { id } = req.params; // Date ID passed in URL
  const { date, name } = req.body; // New date and name to update

  try {
    // Reference to the "unavailable_dates" document
    const unavailableRef = doc(db, "unavailable_dates", id);
    
    // Get the document
    const unavailableDoc = await getDoc(unavailableRef);

    // Check if the document exists
    if (!unavailableDoc.exists()) {
      return res.status(404).json({ error: "Date not found" });
    }

    // Update the document fields
    await updateDoc(unavailableRef, {
      date: date,
      name: name,
    });

    res.redirect("/unavailable-dates");
  } catch (err) {
    console.error("Error updating date:", err);
    res.status(500).json({ error: "Unable to update the date" });
  }
});

// POST route to create a new unavailable date (for the create form)
app.post("/unavailable_dates_create", async (req, res) => {
  try {
      const { date, name } = req.body;

      if (!date || !name) {
          return res.status(400).json({ error: "Date and name are required" });
      }

      // Add new unavailable date to Firestore
      const docRef = await addDoc(collection(db, "unavailable_dates"), {
          date,
          name
      });

      res.redirect("/unavailable-dates");
  } catch (error) {
      console.error("Error adding unavailable date:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

  
  
  
  

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////




app.use(async (req, res, next) => {
  try {
    const snapshot = await getDocs(collection(db, 'unavailable_dates'));

    // Convert dates to "dd-MM-yyyy" format
    const unavailableDatesList = snapshot.docs.map(doc => {
      const rawDate = doc.data().date; // Ensure this is a valid date string
      return moment(rawDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
    });

    res.locals.unavailableDatesList = unavailableDatesList;
  } catch (error) {
    console.error("Error fetching unavailable dates:", error);
    res.locals.unavailableDatesList = [];
  }

  next();
});








const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});



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

    // Query Firestore to get all bookings in the next 30 days
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('date', '>=', today.toISOString().split('T')[0]),
      where('date', '<=', thirtyDaysLater.toISOString().split('T')[0])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings = bookingsSnapshot.docs.map(doc => doc.data());

    // Query Firestore to get all room names
    const roomsSnapshot = await getDocs(collection(db, 'meeting_rooms'));
const roomNames = roomsSnapshot.docs.reduce((acc, doc) => {
  const roomData = doc.data();
  const roomId = doc.id;  // Firestore document ID used as room_id
  acc[roomId] = roomData.name; // Store the room name with roomId as key
  return acc;
}, {});

    // Initialize an object to track booked time slots for each room and each date
    const timeSlotsByRoomAndDate = {};

    // Process each booking
    for (const booking of bookings) {
      const { room_id, date, starttime, endtime } = booking;

      // Parse the start and end times
      const bookingStart = new Date(`${date}T${starttime}`);
      const bookingEnd = new Date(`${date}T${endtime}`);

      // Divide the day into 30-minute intervals (from 8 AM to 6 PM)
      const timeSlots = [];
      for (
        let slot = new Date(`${date}T08:00`);
        slot < new Date(`${date}T18:00`);
        slot.setMinutes(slot.getMinutes() + 30)
      ) {
        timeSlots.push(new Date(slot).toISOString());
      }

      // Mark booked time slots for a specific room and date
      for (let slot of timeSlots) {
        const slotTime = new Date(slot);
        if (slotTime >= bookingStart && slotTime < bookingEnd) {
          if (!timeSlotsByRoomAndDate[room_id]) {
            timeSlotsByRoomAndDate[room_id] = {};
          }
          if (!timeSlotsByRoomAndDate[room_id][date]) {
            timeSlotsByRoomAndDate[room_id][date] = new Set();
          }
          timeSlotsByRoomAndDate[room_id][date].add(slot);
        }
      }
    }

    // Identify fully booked days for each room (20 slots = 8 AM - 6 PM)
    const fullyBookedRooms = {};

    for (const room_id in timeSlotsByRoomAndDate) {
      for (const date in timeSlotsByRoomAndDate[room_id]) {
        const bookedSlots = timeSlotsByRoomAndDate[room_id][date];
        if (bookedSlots.size === 20) {
          const room_name = roomNames[room_id]; // Get the room name from the roomNames map
          if (!fullyBookedRooms[room_name]) {
            fullyBookedRooms[room_name] = [];
          }
          fullyBookedRooms[room_name].push(formatDate(new Date(date)));
        }
      }
    }

    // Make data available to all templates
    res.locals.fullyBookedRooms = fullyBookedRooms;
    res.locals.user = req.isAuthenticated() ? req.user : null;

    next();
  } catch (err) {
    console.error('Error fetching data from Firestore:', err);
    next(err); // Pass the error to the next middleware
  }
});

// Example route to render fully booked rooms data
app.get('/rooms/fully-booked', (req, res) => {
  res.render('fullyBookedRooms', {
    fullyBookedRooms: res.locals.fullyBookedRooms
  });
});

app.get('/api/user', (req, res) => {
   const user = req.isAuthenticated() ? req.user : null;
   res.json(user); // Send the user data as JSON response
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

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    const fromAdmin = req.body.fromAdmin || false;
    if (err) {
      return next(err);
    }
    // Destroy the session to ensure complete logout
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return next(err);
      }
      if (fromAdmin) {
        // If it's from the admin panel, redirect to the users page or another admin page
        res.redirect("/login");  // Change this to your desired redirect URL
      } else {
        // Redirect to the login page if it's a normal user registration
        res.redirect(req.get("referer") || "/"); // Fallback to home if referer is not available
      }
      // Redirect to login or home page
      
    });
  });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// app.get("/auth/google/callback",
//   passport.authenticate("google", {
//     successRedirect: "/",
//     failureRedirect: "/login",
//   })
// );

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }), 
  (req, res) => {
    if (!req.user) {
      req.flash("error", "Google login failed. Please try again.");
      return res.redirect("/login");
    }

    req.session.email = req.user.email;

    // Redirect based on user role
    if (req.user.role === "superadmin") {
      return res.redirect("/dashboard");
    }

    return res.redirect("/");
  }
);


app.get("/confirmation", async (req, res) => {
  res.render("confirmation.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  const fromAdmin = req.body.fromAdmin || false;  // Check if this was an admin action
  const role = req.body.role || "user";

  try {
    // Check if the email already exists in Firestore
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (!userQuerySnapshot.empty) {
      if (fromAdmin) {
        // If it's from the admin panel, redirect to the users page or another admin page
        res.redirect(`/users?errorMessage=${encodeURIComponent("Email/username already exists. Try to create a different user.")}`);  // Change this to your desired redirect URL
      } else {
        // Redirect to the login page if it's a normal user registration
        res.render("register.ejs", { errorMessage: "Email/username already exists. Try logging in." });
      }
      
    } else {
      // Hash the password using bcrypt
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          // Add user to Firestore and Firestore generates unique uid
          const docRef = await addDoc(collection(db, "users"), {
            email: email,
            password: hash, // Store the hashed password
            role: role,   // Default role, can be modified as needed
            createdAt: new Date(),
          });

          // Use the Firestore generated document ID as the uid
          await updateDoc(docRef, { uid: docRef.id });

          if (fromAdmin) {
            // If it's from the admin panel, redirect to the users page or another admin page
            res.redirect("/users");  // Change this to your desired redirect URL
          } else {
            // Redirect to the login page if it's a normal user registration
            res.render("login.ejs");
          }
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.render("register.ejs", { errorMessage: "An error occurred. Please try again." });
  }
});

app.post("/login",
  (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        req.flash("error", "An error occurred during login. Please try again."); // Generic error message
        return res.redirect("/login");
      }

      if (!user) {
        // Handle specific failure messages from `info`
        if (info && info.message) {
          req.flash("error", info.message);
        } else {
          req.flash("error", "Invalid credentials. Please try again.");
        }
        return res.redirect("/login");
      }

      req.logIn(user, (err) => {
        if (err) {
          req.flash("error", "An error occurred while logging in. Please try again.");
          return res.redirect("/login");
        }

        req.session.email = user.email;

        // Redirect based on user role
        if (user.role === "superadmin") {
          return res.redirect("/dashboard");
        }

        return res.redirect("/");
      });
    })(req, res, next);
  }
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

// passport.use("google", new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: process.env.GOOGLE_CALLBACK_URL,
// }, async (accessToken, refreshToken, profile, cb) => {
//   try {
//     const email = profile.emails[0].value;

//     // Check if the user already exists in Firestore
//     const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

//     let user;
//     if (!userQuerySnapshot.empty) {
//       // User exists, retrieve their data
//       const userDoc = userQuerySnapshot.docs[0];
//       user = { uid: userDoc.id, ...userDoc.data() };
//     } else {
//       // Create new user in Firestore
//       const newUserRef = await addDoc(collection(db, "users"), {
//         email: email,
//         password: null,  // No password needed for OAuth users
//         role: "user",  // Default role
//         createdAt: moment().format("YYYY-MM-DD HH:mm:ss")  // Use moment to format timestamp
//       });

//       // Update the user with Firestore-generated UID
//       await updateDoc(newUserRef, { uid: newUserRef.id });

//       user = { uid: newUserRef.id, email: email, role: "user" };
//     }

//     return cb(null, user);  // Return user object for passport

//   } catch (err) {
//     console.error("Error in Google OAuth strategy:", err);
//     return cb(err);
//   }
// }));

app.get("/bookinglist", async (req, res) => {
  try {
    const currentDate = moment(); // Get the current date and time
    const currentDateString = currentDate.format("YYYY-MM-DD");
    const currentTime = currentDate.format("HH:mm:ss");
    const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD");

    // Query for upcoming bookings (today or after today), ordered by date and starttime
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("date", ">=", currentDateString),  // Fetch bookings for today and beyond
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    // Query for past bookings (before today), ordered by date and starttime
    const pastQuery = query(
      collection(db, "bookings"),
      where("date", "<", currentDateString),
      where("date", ">=", pastLimitDate),
      orderBy("date", "desc"),
      orderBy("starttime", "desc")
    );

    const upcomingSnapshot = await getDocs(upcomingQuery);
    const pastSnapshot = await getDocs(pastQuery);

    // Function to format bookings
    const formatBookings = (snapshot) => {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const bookingDate = moment(data.date);
        const endTime = moment(data.endtime, "HH:mm:ss");

        let status = "upcoming"; // Default status

        // Check if the booking is in the past (based on end time)
        if (bookingDate.isBefore(currentDate, "day") || 
            (bookingDate.isSame(currentDate, "day") && endTime.isBefore(currentDate, "minute"))) {
          status = "past"; // Set status as 'past' if date is before today or time has passed for today
        }

        return {
          booking_id: doc.id,
          username: data.email || 'Unknown', // Default value if 'name' is missing
          date: bookingDate.format("DD-MM-YYYY"),
          start_time: data.starttime || 'N/A',
          end_time: data.endtime || 'N/A',
          description: data.des || data.description || 'No description',
          room: data.room_name ? data.room_name.replace(/\s*\(.*?\)\s*/g, '').trim() : 'N/A',
          booking_date: data.created_at
            ? (data.created_at.toDate
                ? moment(data.created_at.toDate()).format("YYYY-MM-DD")
                : moment(data.created_at).format("YYYY-MM-DD"))
            : 'N/A',
          status: status // Add status field to track whether booking is past or upcoming
        };
        
      });
    };

    // Format both upcoming and past bookings
    const upcomingBookings = formatBookings(upcomingSnapshot);
    const pastBookings = formatBookings(pastSnapshot);

    // Filter past bookings from upcoming ones based on status
    const allBookings = [...upcomingBookings, ...pastBookings];
    const filteredUpcomingBookings = allBookings.filter(booking => booking.status === "upcoming");
    const filteredPastBookings = allBookings.filter(booking => booking.status === "past");

    res.render("bookinglist.ejs", { upcomingBookings: filteredUpcomingBookings, pastBookings: filteredPastBookings });
  } catch (err) {
    console.error("Error retrieving bookings:", err);
    res.status(500).send("Error retrieving bookings.");
  }
});

app.get("/adminbookinglist", async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const currentDate = moment(); // Get the current date and time
    const currentDateString = currentDate.format("YYYY-MM-DD");
    const currentTime = currentDate.format("HH:mm:ss");
    const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD");

    // Query for upcoming bookings (today or after today), ordered by date and starttime
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("date", ">=", currentDateString),  // Fetch bookings for today and beyond
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    // Query for past bookings (before today), ordered by date and starttime
    const pastQuery = query(
      collection(db, "bookings"),
      where("date", "<", currentDateString),
      where("date", ">=", pastLimitDate),
      orderBy("date", "desc"),
      orderBy("starttime", "desc")
    );

    const upcomingSnapshot = await getDocs(upcomingQuery);
    const pastSnapshot = await getDocs(pastQuery);

    // Function to format bookings
    const formatBookings = (snapshot) => {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const bookingDate = moment(data.date);
        const endTime = moment(data.endtime, "HH:mm:ss");

        let status = "upcoming"; // Default status

        // Check if the booking is in the past (based on end time)
        if (bookingDate.isBefore(currentDate, "day") || 
            (bookingDate.isSame(currentDate, "day") && endTime.isBefore(currentDate, "minute"))) {
          status = "past"; // Set status as 'past' if date is before today or time has passed for today
        }

        return {
          booking_id: doc.id,
          username: data.email || 'Unknown', // Default value if 'name' is missing
          date: bookingDate.format("DD-MM-YYYY"),
          start_time: data.starttime || 'N/A',
          end_time: data.endtime || 'N/A',
          description: data.des || data.description || 'No description',
          room: data.room_name ? data.room_name.replace(/\s*\(.*?\)\s*/g, '').trim() : 'N/A',
          booking_date: data.created_at
            ? (data.created_at.toDate
                ? moment(data.created_at.toDate()).format("YYYY-MM-DD")
                : moment(data.created_at).format("YYYY-MM-DD"))
            : 'N/A',
          status: status // Add status field to track whether booking is past or upcoming
        };
        
      });
    };

    // Format both upcoming and past bookings
    const upcomingBookings = formatBookings(upcomingSnapshot);
    const pastBookings = formatBookings(pastSnapshot);

    // Filter past bookings from upcoming ones based on status
    const allBookings = [...upcomingBookings, ...pastBookings];
    const filteredUpcomingBookings = allBookings.filter(booking => booking.status === "upcoming");
    const filteredPastBookings = allBookings.filter(booking => booking.status === "past");

    res.render("adminBookingList.ejs", { upcomingBookings: filteredUpcomingBookings, pastBookings: filteredPastBookings });
  } catch (err) {
    console.error("Error retrieving bookings:", err);
    res.status(500).send("Error retrieving bookings.");
  }
} else {
  res.redirect("/login");
}
});

app.get("/mybookings", async (req, res) => {
  if (req.isAuthenticated()) {
    const currentDate = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");
    const userEmail = req.user.email; // Assuming user email is stored in Firebase users

    try {
      // Fetch all bookings for the logged-in user
      const allBookingsQuery = query(
        collection(db, "bookings"),
        where("email", "==", userEmail), // Filter by logged-in user's email
        orderBy("date", "asc"), // Sort by date first
        orderBy("starttime", "asc") // Then sort by start time
      );

      const bookingsSnapshot = await getDocs(allBookingsQuery);

      // Format and classify bookings into "upcoming" and "past"
      const formattedBookings = bookingsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const bookingEndTime = moment(`${data.date} ${data.endtime}`, "YYYY-MM-DD HH:mm:ss");

        return {
          booking_id: doc.id,
          username: data.email || "Unknown", // Default to 'Unknown' if 'email' is missing
          date: moment(data.date).format("DD-MM-YYYY"),
          start_time: moment(data.starttime, "HH:mm:ss").format("HH:mm")|| "Invalid", // Format start time to HH:mm
          end_time: moment(data.endtime, "HH:mm:ss").format("HH:mm") || "Invalid", // Format end time to HH:mm
          description: data.des || data.description || "No description",
          room: data.room_name ? data.room_name.replace(/\s*\(.*?\)\s*/g, '').trim() : 'N/A',
          booking_date: data.created_at ? 
  (data.created_at.toDate ? moment(data.created_at.toDate()).format("YYYY-MM-DD") : moment(data.created_at).format("YYYY-MM-DD")) 
  : 'N/A',

          isPast: bookingEndTime.isBefore(moment(`${currentDate} ${currentTime}`, "YYYY-MM-DD HH:mm:ss"), "minute"), // Check if booking has already passed
          rawDate: moment(data.date, "YYYY-MM-DD"), // Raw date for sorting
          rawEndTime: moment(data.endtime, "HH:mm:ss"), // Raw time for sorting
        };
      });

      // Separate past and upcoming bookings
      const pastBookings = formattedBookings
        .filter((booking) => booking.isPast) // Only include past bookings
        .sort((a, b) => {
          const dateComparison = b.rawDate.diff(a.rawDate); // Compare by date (descending)
          if (dateComparison === 0) {
            // If dates are the same, compare by end time (descending)
            return b.rawEndTime.diff(a.rawEndTime);
          }
          return dateComparison;
        });

      const upcomingBookings = formattedBookings.filter((booking) => !booking.isPast); // Only include upcoming bookings

      // Render the bookings in the mybookings.ejs view
      res.render("mybookings.ejs", {
        upcomingMyBookings: upcomingBookings,
        pastMyBookings: pastBookings,
      });
    } catch (err) {
      console.error("Error retrieving your bookings:", err);
      res.status(500).send("Error retrieving your bookings.");
    }
  } else {
    res.redirect("/login");
  }
});

app.get('/edit-booking/:id', async (req, res) => {
  if (req.isAuthenticated()) {
    const booking_id = req.params.id;

    try {
      // Query only the specific booking by booking_id in Firestore
      const bookingDocRef = doc(db, "bookings", booking_id);
      const bookingDoc = await getDoc(bookingDocRef);

      if (!bookingDoc.exists()) {
        return res.status(404).send('Booking not found');
      }

      // Use the booking data as needed
      const booking = bookingDoc.data();
      booking.booking_id = bookingDoc.id; // Add the document ID as booking_id
      if (booking.des) {
        booking.description = booking.des;
        delete booking.des; // Remove the original 'des' field to avoid confusion
      }


      // Format the date to DD-MM-YYYY
      booking.date = moment(booking.date).format('DD-MM-YYYY');
      booking.start_time = moment(booking.starttime, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed
      booking.end_time = moment(booking.endtime, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed

      // Render the booking data into editBookings.ejs
      res.render('editBookings.ejs', { booking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).send('Server error');
    }
  } else {
    res.redirect("/login");
  }
});

app.post('/edit', async (req, res) => {
  console.log("Form data received:", req.body);
  if (req.isAuthenticated()) {
    console.log("Request Body:", req.body);
    const { bookingId, room_id, date, start, end, purpose } = req.body;

    const updatedPurpose = purpose || 'Not Stated';

    // Reformat date to YYYY-MM-DD
    const [day, month, year] = date.split('-');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const formattedStartTime = moment(start, 'HH:mm').format('HH:mm:ss');
    const formattedEndTime = moment(end, 'HH:mm').format('HH:mm:ss');

    try {
      // Step 1: Fetch room details (name and capacity) from the database using room_id
      const roomDoc = await getDoc(doc(db, "meeting_rooms", room_id));
      if (!roomDoc.exists()) {
        return res.status(404).send("Room not found");
      }
      const roomData = roomDoc.data();
      const room_name = `${roomData.name}`;

      // Step 2: Update the booking details in Firestore
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        date: formattedDate,
        starttime: formattedStartTime,
        endtime: formattedEndTime,
        description: updatedPurpose,
        room_id: room_id,
        room_name: room_name,
        created_at: new Date().toISOString(),
      });

      // Step 3: Delete existing timeslots associated with the booking
      const timeslotsQuery = query(
        collection(db, "timeslots"),
        where("booking_id", "==", bookingId)
      );
      const timeslotsSnapshot = await getDocs(timeslotsQuery);

      const deletePromises = timeslotsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Step 4: Generate and insert new timeslots
      const timeslots = [];
      let startTime = new Date(`1970-01-01T${start}`);
      let endTime = new Date(`1970-01-01T${end}`);

      while (startTime < endTime) {
        const slotTime = startTime.toTimeString().substring(0, 5);
        timeslots.push(slotTime);

        // Add each new timeslot to Firestore
        await addDoc(collection(db, "timeslots"), {
          booking_id: bookingId,
          timeslot: slotTime,
        });

        startTime.setMinutes(startTime.getMinutes() + 15);
      }

       // Step 5: Fetch the user's email and send a confirmation email
       const userEmail = req.user.email;
       if (emailValidator.validate(userEmail)) {
         const mailOptions = {
           from: 'your-email@domain.com', // sender address (must be the same as the SMTP user)
           to: userEmail,  // recipient address (user's email)
           subject: 'Booking Update Confirmation', // email subject
           text: `Hello ${userEmail},\n\nYour booking has been updated.\n\nUpdated Details:\nRoom: ${room_name || "ETC Meeting Room"}\nDate: ${formattedDate}\nStart Time: ${start}\nEnd Time: ${end}\nPurpose: ${updatedPurpose}\n\nThank you for using our booking system.\n\nThis is an auto-generated email. Please do not reply to this email.`,
         };
 
         transporter.sendMail(mailOptions, (error, info) => {
           if (error) {
             console.error('Error sending email:', error);
           } else {
             console.log('Email sent:', info.response);
           }
         });
       } else {
         console.log('Invalid email format, not sending email.');
       }
 

      res.render("confirmation.ejs", {
        booking: {
          id: bookingId,
          date: `${day}-${month}-${year}`,
          startTime: start,
          endTime: end,
          room: room_name ? room_name.replace(/\(.*?\)/g, '').trim() : 'Room not found',
          purpose: updatedPurpose,
        },
        timeslots,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).send("Error updating booking");
    }
  } else {
    res.redirect("/login");
  }
});

app.post('/next', async (req, res) => {
  const { room_id, date, purpose, start, end } = req.body;

  // Validate required fields
  if (!room_id || !date) {
    return res.status(400).send('room_id and date are required');
  }

  // Reformat date to YYYY-MM-DD
  let formattedDate;
  try {
    const [day, month, year] = date.split('-');
    formattedDate = `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Invalid date format:', date);
    return res.status(400).send('Invalid date format');
  }

  try {
    // Fetch room details from Firestore
    const roomDoc = await getDoc(doc(db, 'meeting_rooms', room_id));
    if (!roomDoc.exists()) {
      console.error('Room not found for room_id:', room_id);
      return res.status(400).send('Room not found');
    }

    const roomName = `${roomDoc.data().name}`;

    // Validate roomName and formattedDate
    if (!formattedDate || !roomName) {
      console.error('Invalid query parameters:', { formattedDate, roomName });
      return res.status(400).send('Invalid query parameters');
    }

    // Query Firestore for bookings on the given date and room
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('date', '==', formattedDate),
      where('room_name', '==', roomName)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (bookingsSnapshot.empty) {
      return res.json({ timeslots: [], end_times: [], start_times: [], booking_ids: [] });
    }

    const timeslots = [];
    const endTimes = [];
    const startTimes = [];
    const bookingIds = [];

    bookingsSnapshot.forEach((doc) => {
      const { starttime, endtime } = doc.data();

      const [startHours, startMinutes] = starttime.split(':').map(Number);
      const [endHours, endMinutes] = endtime.split(':').map(Number);

      const startDateTime = new Date(1970, 0, 1, startHours, startMinutes);
      const endDateTime = new Date(1970, 0, 1, endHours, endMinutes);

      let currentTime = startDateTime;
      while (currentTime < endDateTime) {
        const slot = currentTime.toTimeString().substring(0, 5);
        timeslots.push(slot);
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }

      startTimes.push(starttime);
      endTimes.push(endtime);
      bookingIds.push(doc.id);
    });

    res.json({ timeslots, end_times: endTimes, start_times: startTimes, booking_ids: bookingIds });

  } catch (error) {
    console.error('Error fetching timeslots and end_times:', error);
    res.status(500).send('Error fetching timeslots and end_times');
  }
});

app.post('/submit', async (req, res) => {
  if (req.isAuthenticated()) {
    let { room_id, date, start, end, purpose } = req.body;
    room_id = room_id || null; // Default room ID (null if not selected)
    purpose = purpose || 'Not Stated'; // Default purpose

    // Reformat the date
    const [day, month, year] = date.split('-');
    const formattedDate = `${year}-${month}-${day}`;

    try {
      // Step 1: Fetch the room name and capacity based on room_id
      let roomName = null;
      if (room_id) {
        const roomDoc = await getDoc(doc(db, 'meeting_rooms', room_id));
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          const capacity = roomData.capacity || "Unknown"; // Fetch room capacity (default "Unknown" if not available)
          roomName = `${roomData.name}`; // Combine room name and capacity
        }
      }

      // Step 2: Insert booking details into Firestore
      const bookingData = {
        name: req.user.email || "Anonymous", // Add user's name if available
        email: req.user.email, // Add user's email
        date: formattedDate,
        starttime: start,
        endtime: end,
        description: purpose,
        created_at: new Date().toISOString(), // Use ISO format for created_at
        room_id: room_id, // Include the selected room's ID
        room_name: roomName, // Include the selected room's name with capacity
      };

      // Add the booking data to the "bookings" collection
      const bookingRef = await addDoc(collection(db, "bookings"), bookingData);

      // Step 3: Validate the email format before sending
      if (emailValidator.validate(req.user.email)) {
        // Send the email without blocking the process if it fails
        const mailOptions = {
          from: 'your-email@domain.com', // sender address (must be the same as the SMTP user)
          to: req.user.email,  // recipient address (user's email)
          subject: 'Booking Confirmation', // email subject
          text: `Hello ${req.user.email},\n\nYour booking has been confirmed.\n\nDetails:\nRoom: ${roomName || "Room 1"}\nDate: ${formattedDate}\nStart Time: ${start}\nEnd Time: ${end}\nPurpose: ${purpose}\n\nThank you for using our booking system.\n\nThis is an auto-generated email. Please do not reply to this email.`,
        };        

        // Try sending the email in a non-blocking way
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
          } else {
            console.log('Email sent:', info.response);
          }
        });
      } else {
        console.log('Invalid email format, not sending email.');
      }

      // Step 4: Prepare data for the confirmation page
      const queryParams = new URLSearchParams({
        id: bookingRef.id,
        date: formattedDate,
        startTime: start,
        endTime: end,
        room: roomName,
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

app.get('/calendarPage', async (req, res) => {
  try {
    const currentDate = moment(); // Get the current date and time
    const currentDateString = currentDate.format("YYYY-MM-DD");
    const currentTime = currentDate.format("HH:mm:ss");
    const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD"); // Date 30 days ago

    // Query for upcoming bookings (today or after today), ordered by date and starttime
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("date", ">=", currentDateString),  // Fetch bookings for today and beyond
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    // Query for past bookings (before today), ordered by date and starttime
    const pastQuery = query(
      collection(db, "bookings"),
      where("date", "<", currentDateString),
      where("date", ">=", pastLimitDate),
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    const upcomingSnapshot = await getDocs(upcomingQuery);
    const pastSnapshot = await getDocs(pastQuery);

    // Function to format bookings
    const formatBookings = (snapshot) => {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const bookingDate = moment(data.date);
        const endTime = moment(data.endtime, "HH:mm:ss");

        let status = "upcoming"; // Default status

        // Check if the booking is in the past (based on end time)
        if (bookingDate.isBefore(currentDate, "day") || 
            (bookingDate.isSame(currentDate, "day") && endTime.isBefore(currentDate, "minute"))) {
          status = "past"; // Set status as 'past' if date is before today or time has passed for today
        }

        return {
          booking_id: doc.id,
          username: data.email || 'Unknown', // Default value if 'name' is missing
          date: bookingDate.format("DD-MM-YYYY"),
          start_time: data.starttime || 'N/A',
          end_time: data.endtime || 'N/A',
          description: data.des || data.description || 'No description',
          room: data.room_name ? data.room_name.replace(/\[.*?\]|\(.*?\)/g, '').split(' ').slice(0, 2).join(' ') : '2',
          booking_date: moment(data.created_at).format("DD-MM-YYYY"),
          status: status // Add status field to track whether booking is past or upcoming+
        };
      });
    };

    // Format both upcoming and past bookings
    const upcomingBookings = formatBookings(upcomingSnapshot);
    const pastBookings = formatBookings(pastSnapshot);

    // Filter past bookings from upcoming ones based on status
    const allBookings = [...upcomingBookings, ...pastBookings];
    const filteredUpcomingBookings = allBookings.filter(booking => booking.status === "upcoming");
    const filteredPastBookings = allBookings.filter(booking => booking.status === "past");

    // Pass formatted bookings to your calendar view
    res.render('calendar.ejs', { upcomingBookings: filteredUpcomingBookings, pastBookings: filteredPastBookings });
  } catch (err) {
    console.error("Error retrieving bookings:", err);
    res.status(500).send("Error retrieving bookings.");
  }
});

app.get('/delete/:id', async (req, res) => {   
  if (req.isAuthenticated()) {
    const bookingId = req.params.id; // Extract bookingId from the URL
    const userEmail = req.user.email; // Get the email of the logged-in user
    const userRole = req.user.role;

    try {
      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnap = await getDoc(bookingRef);
  
      if (!bookingSnap.exists()) {
        return res.status(404).send("Booking not found");
      }

      if (userRole === 'admin') {
        // Admin is allowed to delete any booking
        await deleteDoc(bookingRef);
        return res.render('delete-confirmation.ejs', {
          bookingId: req.params.id,
          user: req.session.user
        });
      }
  
      // Verify that the booking belongs to the current user
      const bookingData = bookingSnap.data();
      if (bookingData.email !== userEmail) {
        return res.status(403).send("Not authorized to delete this booking");
      }
  
      await deleteDoc(bookingRef);
      res.render('delete-confirmation.ejs', {
        bookingId: req.params.id,
        user: req.session.user
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).send('Error deleting booking');
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/delete-confirmation', (req, res) => {
  res.render('delete-confirmation.ejs');
});

app.post("/submit-feedback", async (req, res) => {
  const { name, contactNumber, email, description } = req.body;

  try {
    // Add data to the Firestore 'feedback' collection
    const feedbackRef = await addDoc(collection(db, "feedback"), {
      name: name || "Anonymous",
      contactNumber: contactNumber || "No Contact Number",
      email: email || "No Email" ,
      description: description,
      status: "pending", // You can modify this according to your needs
    });

    // After successfully adding to Firestore, you can redirect or send a success message
    res.redirect("/thank-you"); // Redirect to a thank you page or show a success message
  } catch (error) {
    console.error("Error adding document: ", error);
    res.status(500).send("Error submitting feedback. Please try again.");
  }
});

app.get("/thank-you", (req, res) => {
  res.render("thankYou.ejs");
});

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









