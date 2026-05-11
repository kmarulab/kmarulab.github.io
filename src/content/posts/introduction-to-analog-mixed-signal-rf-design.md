---
title: "Introduction to the World of Analog, Mixed-Signal & RF Design"
date: "2025-03-11"
description: "A personal entry point into analog, mixed-signal, RF design, and the semiconductor ecosystem behind modern wireless systems."
author: "Kimaru Boruett"
category: "Technical"
tags: ["analog", "mixed-signal", "rf", "semiconductors", "digital-signal-processing"]
image: "/assets/images/posts/analog-rf/applications.jpg"
external_url: "https://emkboruett.medium.com/introduction-to-the-world-of-analog-mixed-signal-rf-design-1c88e4b53501"
---

Latest Update:

Due to an insanely busy schedule towards the end of the semester and into summer, this series didn’t fully materialize. Will post as soon as I get the time, stay tuned!

Being passionate about many different topics can be both exciting and overwhelming. As an Electrical Engineering student, I’ve flirted with various disciplines , from embedded systems to kernel programming to GPU programming, before landing on my most recent and probably final fascination: analog, mixed-signal, and RF design.

Over the last year, I’ve come to appreciate just how critical analog and RF circuitry is to modern technology. From smartphones and base stations enabling 5G, to advanced medical imaging devices, all the way to radar systems in self-driving cars, these fields power the electronic “nervous system” of our world. This blog series marks the beginning of my deeper dive into these areas, and I’m thrilled to share my journey with you.

In the broader semiconductor ecosystem, the companies that particularly draw my attention are the Integrated Device Manufacturers (IDMs) — firms like Texas Instruments, Analog Devices, Infineon, and others that design and fabricate their own chips. However, they’re far from the only players in the industry. Fabless chip firms (such as Qualcomm, Broadcom, and NVIDIA), foundries (like TSMC and Samsung), IP and design software providers (e.g., Cadence, Synopsys, Siemens), and equipment manufacturers (ASML, Tokyo Electron) all have vital roles. Together, these entities form a tightly knit, interdependent network , an “ecosystem” in which each stage of the process, from initial design to final packaging, hinges on the others. Understanding how they collaborate helps illustrate how an idea in a design lab becomes a tangible product that shapes our technological landscape. To read more about the ecosystem, click the link on the caption of the figure below.

<figure>
  <img src="/assets/images/posts/analog-rf/ecosystem.png" alt="Semiconductor Ecosystem" />
  <figcaption>Semiconductor Ecosystem</figcaption>
</figure>

## Why Analog/Mixed-Signal & RF Design Matters

Despite the buzz around digital and software-centric technologies, our analog and mixed-signal front-ends remain the vital bridges between the physical world and the digital domain. While digital circuits process ones and zeros:

1. Analog Circuits handle and process continuous signals (e.g., audio, temperature, radio waves).
2. Mixed-Signal Circuits combine analog and digital functions on a single chip (think of an ADC or DAC in your smartphone).
3. RF (Radio Frequency) Circuits deal with high-frequency signals crucial for wireless communications, radar, and high-speed data links.

No matter how advanced the digital side gets, it still has to interface with the real world via analog/RF front ends. Innovations here fuel the explosive growth of 5G (and beyond), IoT, wearables, automotive radar, satellite communications, and more.

<figure>
  <img src="/assets/images/posts/analog-rf/applications.jpg" alt="Possible Applications" />
  <figcaption>Possible Applications</figcaption>
</figure>

## My Journey So Far

Last summer, I interned at a telecom company. While my role wasn’t heavy on deep technical tasks, it introduced me to the complex interplay of hardware and software that keeps our world connected. Watching how different components such as antennas, RF modules and basebands fit together to provide seamless connectivity piqued my interest.

Curious about how these systems are developed, I dove into the histories of companies like ADI, TI, Qualcomm, and Broadcom, all known for their IC (Integrated Circuit) innovations. I was amazed by how analog and RF design touches countless applications: from driverless car radars to high-resolution medical imaging.

Around the same time, I began self-studying analog IC design, first using Sedra/Smith’s Microelectronics and now this semester using Razavi’s classic textbook, Design Of Analog CMOS Integrated Circuit. I have thus far covered fundamentals like: Diodes and Op-Amps, MOSFET I – V characteristics, Single-stage and differential amplifiers, Current mirrors and Frequency response of amplifiers.

I’m also gearing up for an opportunity to join an RFIC lab at Cornell this summer, hopefully by May we can pick apart a research paper together and really dive into the technical details. In parallel, I’ve been exploring open-source tools for circuit simulation, which can be a bit daunting to set up at first. Dr Carsten Wulff has been a tremendous help in this regard; he provides fantastic video lectures, tutorials and even a comprehensive lecture book that walks through these open-source workflows.

<figure>
  <img src="/assets/images/posts/analog-rf/tools.jpg" alt="Common Tools" />
  <figcaption>Common Tools</figcaption>
</figure>

It’s worth mentioning, though, that in the industry, Cadence is often considered the gold standard for IC design. Their tools are however proprietary and quite expensive, therefore not quite viable for smaller engineering departments where maybe two or three students will make use of them. I’m hoping my summer role will give me hands-on experience with Cadence(Virtuoso, Spectre) so I can really sharpen my skills. For now, I’m testing out tools like Magic, ngspice, and the SkyWater 130nm PDK as open-source alternatives. I’m definitely not an expert on these platforms yet, but they’re a great way to learn the fundamentals without the costs and licensing hurdles of commercial software.

## Blog Series Overview

I plan to release two blog posts per week (with occasional extras if inspiration strikes). This series will start with the basics and move toward more advanced topics:

1. Transistor Fundamentals (MOSFET Focus)
2. Single-Stage Amplifiers
3. Differential Amplifiers
4. Current Mirrors
5. Frequency Response & Compensation
6. TBD

Over the next three weeks, I plan to cover the material I’ve already studied, which will serve as a solid review for me while I continue working through the textbook. During this time, I’ll also introduce a few digital signal processing concepts, especially those related to filtering and sampling since they often intersect with analog design.

MOSFET Current Mirror

## Prerequisite Knowledge

This series assumes a basic grasp of circuit theory; including Ohm’s law, nodal analysis, op-amp fundamentals, and a general understanding of diode operation. The first technical post will focus on transistors, providing a solid foundation for everything that follows.

## Final Thoughts

I’m excited to share my passion for analog, mixed-signal, and RF design in this blog series. Whether you’re a student exploring the field for the first time or a practicing engineer wanting to revisit the fundamentals, I hope you’ll find something useful here. Keep an eye out for the next post later this week, where we dive into Transistor Basics and set the stage for our exploration of amplifier design.

IC Dialogue

If you have questions, suggestions, or topics you’d like to see covered, feel free to leave a comment or reach out directly. Let’s learn together and demystify the world of analog, mixed-signal, and RF design.

Analog Circuit Radio Frequency Mixed Signal Semiconductors Digital Signal Processing

[Read the original Medium article](https://emkboruett.medium.com/introduction-to-the-world-of-analog-mixed-signal-rf-design-1c88e4b53501) or view the local PDF mirror: [analog-mixed-signal-rf-design.pdf](/resources/medium/analog-mixed-signal-rf-design.pdf).
