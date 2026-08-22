import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Particle from "../Particle";

function Experience() {
  return (
    <Container fluid className="resume-section">
      <Particle />
      <Container>
        <h1 className="project-heading">
          Professional <strong className="purple">Experience</strong>
        </h1>
        <p style={{ color: "white" }}>
          Software engineering, banking technology, research, and internships.
        </p>

        <Row className="resume">
          <Col md={12}>
            <div className="resume-item">
              <h3 className="resume-title">
                Software Engineer — Reviewer.ly
              </h3>
              <p className="experience-date">2026 – Present · Greater Toronto Area</p>
              <ul>
                <li>
                  Building production software and contributing to AI-enabled
                  product features alongside a research-driven engineering team.
                </li>
                <li>
                  Collaborating with supervisors and faculty partners to ship
                  reliable, user-facing engineering work.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Application / Software Developer Co-op — CIBC LiveLabs
              </h3>
              <p className="experience-date">Sep 2025 – Dec 2025 · Toronto, ON</p>
              <ul>
                <li>
                  Built a production-grade banking feature for Automated Money
                  Movement, supporting large-scale financial transaction
                  workflows.
                </li>
                <li>
                  Developed scalable Swift / SwiftUI components integrated with
                  enterprise backend systems.
                </li>
                <li>
                  Built an AI-enabled prototype to improve financial literacy
                  and support better financial decision-making.
                </li>
                <li>
                  Reached 85%+ unit test coverage and improved code quality
                  with SonarQube, while leading a cost-optimization initiative
                  that reduced infrastructure costs by 25%+.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Technical Systems Analyst — CIBC
              </h3>
              <p className="experience-date">Sep 2024 – Sep 2025 · Toronto, ON</p>
              <ul>
                <li>
                  Automated workflows with Excel VBA and Power BI, reducing
                  manual effort by 40%.
                </li>
                <li>
                  Built dashboards and analytical reporting that improved
                  decision-making speed by 30%.
                </li>
                <li>
                  Analyzed and processed 100+ change requests per month,
                  supporting requirements validation, testing, implementation,
                  and 100% compliance.
                </li>
                <li>
                  Strengthened validation processes and controls, contributing
                  to a 25% reduction in operational risk incidents.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Software Engineer Intern — Veebar Tech
              </h3>
              <p className="experience-date">May 2023 – Feb 2024</p>
              <ul>
                <li>
                  Built backend systems with Node.js, TypeScript, and MongoDB
                  for scalable application workflows.
                </li>
                <li>
                  Optimized data processing pipelines to improve real-time
                  system performance.
                </li>
                <li>
                  Created an iOS safety application for Alzheimer&apos;s
                  patients with under 1-second alert latency.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Research Assistant — Toronto Metropolitan University
              </h3>
              <p className="experience-date">
                Feb 2023 – May 2023 · Supervised by Dr. Alireza Sadeghian
              </p>
              <ul>
                <li>
                  Processed 50,000+ CIFAR-10 and ImageNet images for computer
                  vision experiments.
                </li>
                <li>
                  Generated Grad-CAM heatmaps to improve model interpretability
                  and support deep learning analysis.
                </li>
                <li>
                  Worked with TensorFlow and PyTorch to support machine
                  learning pipeline experimentation.
                </li>
              </ul>
            </div>
          </Col>
        </Row>

        <h1 className="project-heading" style={{ paddingTop: "20px" }}>
          Awards &amp; <strong className="purple">Recognition</strong>
        </h1>
        <Row className="resume">
          <Col md={12}>
            <div className="resume-item">
              <h3 className="resume-title">
                Faculty of Science Dean&apos;s List
              </h3>
              <p className="experience-date">
                Toronto Metropolitan University · 2022 – 2026
              </p>
              <ul>
                <li>
                  Recognized for academic excellence in the Computer Science
                  Co-op program, including the 2025–2026 Dean&apos;s List.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Louise Penny Library Research Award
              </h3>
              <p className="experience-date">
                TMU Libraries · Inaugural recipient
              </p>
              <ul>
                <li>
                  Awarded for the research paper &quot;Shade That Sustains:
                  Agrivoltaics and the Future of Biodiverse, Water-Resilient
                  Rural Landscapes.&quot;
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Geoff Boyes International Student Leadership Award
              </h3>
              <p className="experience-date">
                Faculty of Science, Toronto Metropolitan University
              </p>
              <ul>
                <li>
                  Recognized for leadership and community-building
                  contributions as an international student in the Faculty of
                  Science.
                </li>
              </ul>
            </div>

            <div className="resume-item">
              <h3 className="resume-title">
                Geoff Boyes Student Leadership Award &amp; Entrance Scholarship
              </h3>
              <p className="experience-date">Toronto Metropolitan University</p>
              <ul>
                <li>
                  Honoured for outstanding leadership and academic achievement
                  throughout the Computer Science Co-op program.
                </li>
              </ul>
            </div>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

export default Experience;
