import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import ProjectCard from "./ProjectCards";
import Particle from "../Particle";
import Bank from "../../Assets/Projects/Bank.png";
import GreenTune from "../../Assets/Projects/GreenTune.png";
import Medmatch from "../../Assets/Projects/Medmatch.png";
import Nextjs from "../../Assets/Projects/Nextjs.png";
import Nasaapi from "../../Assets/Projects/Nasaapi.png";
import backlog from "../../Assets/Projects/backlog.png";

function Projects() {
  return (
    <Container fluid className="project-section">
      <Particle />
      <Container>
        <h1 className="project-heading">
          My Recent <strong className="purple">Works </strong>
        </h1>
        <p style={{ color: "white" }}>
          Selected academic, hackathon, and personal projects.
        </p>
        <Row style={{ justifyContent: "center", paddingBottom: "10px" }}>
          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={Bank}
              isBlog={false}
              title="Bank Management System"
              description="Java banking application with authentication, financial transactions, account management, and a secure relational MySQL design. Built with Swing/AWT to simulate real-world ATM and teller workflows."
              ghLink="https://github.com/AmiraliEsi83/Bank-Management-System"
            />
          </Col>

          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={GreenTune}
              isBlog={false}
              title="GreenTune — MetHacks 2023"
              description="Hackathon project focused on sustainability-minded product design. Built during MetHacks 2023 as a collaborative, time-boxed engineering sprint."
              ghLink="https://github.com/AmiraliEsi83/MetHacks2023"
            />
          </Col>

          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={Medmatch}
              isBlog={false}
              title="Medmatch Legal"
              description="Legal Medmatch project exploring structured matching and document workflows for legal use cases. Built as a practical application of product thinking and full-stack implementation."
              ghLink="https://github.com/AmiraliEsi83/Medmatch-legal"
            />
          </Col>

          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={Nextjs}
              isBlog={false}
              title="Next.js App"
              description="A Next.js web application used to practice modern React patterns, routing, and production deployment on Vercel."
              ghLink="https://github.com/AmiraliEsi83/Next.js"
              demoLink="https://next-js-orcin-zeta.vercel.app"
            />
          </Col>

          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={Nasaapi}
              isBlog={false}
              title="NASA API Explorer"
              description="A web page that uses NASA's Astronomy Picture of the Day API to display curated space imagery on responsive cards."
              ghLink="https://github.com/AmiraliEsi83/Nasa-API"
              demoLink="https://amiraliesi83.github.io/Nasa-API/"
            />
          </Col>

          <Col md={4} className="project-card">
            <ProjectCard
              imgPath={backlog}
              isBlog={false}
              title="Backlog Site"
              description="Simple workflow management application that helps users organize work items and keep personal projects moving."
              ghLink="https://github.com/AmiraliEsi83/backlog-site"
              demoLink="https://amiraliesi83.github.io/backlog-site/"
            />
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

export default Projects;
