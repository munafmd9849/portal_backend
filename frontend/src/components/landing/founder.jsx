"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { FaQuoteLeft, FaQuoteRight } from "react-icons/fa6";

import R1 from "../../assets/images/Rec1.png";
import R2 from "../../assets/images/Rec2.png";
import R3 from "../../assets/images/Rec3.png";

// ----------------- Animated Testimonials -----------------
const AnimatedTestimonials = ({ testimonials, autoplay = false }) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index) => index === active;

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => Math.floor(Math.random() * 21) - 10;

  return (
    <div className="mx-auto max-w-sm px-4 py-10 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12">
      <div className="relative grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* ----- IMAGE SECTION ----- */}
        <div>
          <div className="relative h-80 w-full">
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.src}
                  initial={{ opacity: 0, scale: 0.9, rotate: randomRotateY() }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index)
                      ? 40
                      : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9, rotate: randomRotateY() }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-0 origin-bottom"
                >
                  <img
                    src={testimonial.src}
                    alt={testimonial.name}
                    className="h-full w-full rounded-3xl object-cover"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ----- TEXT SECTION ----- */}
        <div className="flex flex-col justify-between py-4">
          <motion.div
            key={active}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <h3 className="text-2xl font-bold">{testimonials[active].name}</h3>
            <p className="text-sm text-gray-500">
              {testimonials[active].designation}
            </p>

            {/* QUOTE TEXT WITH ICONS */}
            <motion.p className="mt-8 text-lg text-gray-500 leading-relaxed">
              <FaQuoteLeft className="inline text-2xl text-blue-900 mr-2 align-top" />
              {testimonials[active].quote.split(" ").map((word, index, arr) => (
                <motion.span
                  key={index}
                  initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: 0.02 * index,
                  }}
                  className="inline-block"
                >
                  {word}
                  {/* Attach closing quote to last word */}
                  {/* {index === arr.length - 1 && (
                    <FaQuoteRight className="inline text-blue-900 ml-2 align-bottom" />
                  )} */}
                  &nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-4 pt-8">
            <button
              onClick={handlePrev}
              className="group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
            >
              <IconArrowLeft className="h-5 w-5 text-black group-hover/button:rotate-12 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              className="group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
            >
              <IconArrowRight className="h-5 w-5 text-black group-hover/button:-rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------- MAIN TESTIMONIAL + FORM SECTION -----------------
export default function TestimonialSection() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });

  const testimonials = [
    {
      src: `${R1}`,
      name: "Arvind Kumar",
      designation: "Software Engineer",
      quote:
        `Hiring from them has always felt less like a transaction and more like discovering a hidden talent gem—shiny, valuable, and instantly impressive`,
    },
    {
      src: `${R2}`,
      name: "Priya Patel",
      designation: "Data Analyst",
      quote:
        `Working with them is like having a recruitment cheat code—every role gets filled with that perfect candidate`,
    },
    {
      src: `${R3}`,
      name: "Shobhit Singh",
      designation: "Marketing Specialist",
      quote:
        `Hiring from them has always been suspiciously easy—like they've cracked some secret hiring algorithm`,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for your message! We will get back to you soon.");
    setFormData({ name: "", company: "", email: "", message: "" });
  };

  return (
    <div id="founders-section" className="container mx-auto px-4 lg:px-8 py-12 flex flex-col lg:flex-row gap-8">
      {/* TESTIMONIALS */}
      <div className="w-full lg:w-2/3">
        <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
      </div>

      {/* CONTACT FORM */}
      <div id="contact-form" className="w-full lg:w-1/3">
        <div className="sticky top-[10%] bg-gray-100 p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Let's Collaborate and Build
          </h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Company's Name"
              className="w-full p-3 border border-gray-400 rounded-md mb-3 focus:border-indigo-500"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="company"
              placeholder="Contact Number"
              className="w-full p-3 border border-gray-400 rounded-md mb-3 focus:border-indigo-500"
              value={formData.company}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="w-full p-3 border border-gray-400 rounded-md mb-3 focus:border-indigo-500"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <textarea
              name="message"
              placeholder="Your recruitment needs"
              rows={4}
              className="w-full p-3 border border-gray-400 rounded-md mb-4 focus:border-indigo-500"
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <button
              type="submit"
              className="w-full bg-blue-900 text-white py-3 rounded-md hover:bg-indigo-600 transition-colors"
            >
              Let's Talk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
