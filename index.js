const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const player = require("play-sound")((opts = {}));
const path = require("path");


require('dotenv').config()

const emailList = process.env.EMAILS_TO_NOTIFY.split(",");


// Function to send email notification
async function sendEmailNotification() {
  // Create reusable transporter object using SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Compose email content
  let mailOptions = {
    from: "notification@rubenk.com.np",
    to: emailList.join(", "),
    subject: "Changes Detected on Webpage",
    text: `Changes detected on the webpage [TEST MAIL]`,
    html: `Change detected on webpage, please find the file attached for screenshot of the webpage`,
    attachments: [
      {
        filename: `screenshot.png`,
        path: path.join(__dirname, "assets/screenshot.png"),
      },
    ],
  };
  // Send email
  let info = await transporter.sendMail(mailOptions);
  console.log("Email notification sent:", info.messageId);
}

// Main function to monitor webpage changes
async function monitorWebpageChanges(url) {
  try {
    const browser = await puppeteer.launch({
      headless: false, // Launch browser with headful mode
      args: ["--disable-notifications"], // Disable notifications
    });

    // 954x1043

    const page = await browser.newPage();
    await page.setViewport({
      width: 954,
      height: 1043,
      deviceScaleFactor: 1,
    });

    // Disable geolocation permission prompt
    await page.evaluateOnNewDocument(() => {
      navigator.geolocation.getCurrentPosition = (success, error, options) => {
        success({
          coords: { accuracy: 21, latitude: 42.948775, longitude: -81.4046758 },
        });
      };
    });
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    //  concent given
    console.log(`Clicking I concent`);
    let el = await page.waitForSelector("text/I consent");
    await el?.click();
    console.log('"I consent" clicked.');

    console.log("Waiting for zipcode input field to appear...");
    el = await page.waitForSelector("#zipcode-nav-guide", { visible: true });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Zipcode input field appeared.");

    // writes london
    console.log('Typing "London" into the zipcode input field...');
    await page.type("#zipcode-nav-guide", "London", { delay: 100 });

    // wait for 3 sec so the location suggestion loads
    // then clicks 1st suggestion
    console.log("Waiting for location suggestions to load...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    let firstSuggestion = await page.evaluate(
      () => document.getElementById("0").textContent
    );
    el = await page.waitForSelector(`text/${firstSuggestion}`);
    await el?.click();
    console.log("First location suggestion clicked.");

    // clicks next
    console.log('Clicking "Next" button...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    el = await page.waitForSelector("text/Next");
    await el?.click();
    console.log('"Next" button clicked.');

    // clicks skip for next page
    console.log('Clicking "Skip" button...');
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await page.keyboard.press("Enter"); // Enter Key

    console.log('Clicking "Done" key...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.keyboard.press("Enter");

    console.log('"Skip" button clicked.');

    setInterval(async () => {
      // reload page
      console.log("----------------------------\nReloading page...");
      try {
        await page.reload();
        el = await page.$(
          "text/Sorry, there are no jobs available that match your search."
        );

        if (!el) {
          // send notification
          let pathOfSiren = path.join(`${__dirname}`, `/assets/siren.mp3`);
          player.play(pathOfSiren, function (err) {
            if (err) throw err;
          });

          let screenshotpath = path.join(__dirname, "assets", "screenshot.png");
          await page.screenshot({ path: screenshotpath });

          sendEmailNotification();
        }
      } catch (err) {
        console.log("Some error occured inside");
        console.log(err.message);
      }
    }, 60000); // checks every 1min
  } catch (e) {
    console.log("Some error occured");
    console.log(e.message);
  }
}

const webpageUrl = "https://hiring.amazon.ca/app#/jobSearch";
monitorWebpageChanges(webpageUrl)
  .then(() => console.log("Monitoring started..."))
  .catch((err) => console.error("Error occurred:", err));
