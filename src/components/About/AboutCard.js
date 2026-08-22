import React from "react";
import Card from "react-bootstrap/Card";
import { ImPointRight } from "react-icons/im";

function AboutCard() {
  return (
    <Card className="quote-card-view">
      <Card.Body>
        <blockquote className="blockquote mb-0">
          <p style={{ textAlign: "justify" }}>
            Hi, I am <span className="purple">Amir Ali Eslami </span>
            from <span className="purple"> Toronto, Canada.</span>
            <br />
            I am a fourth-year Computer Science Co-op student at Toronto
            Metropolitan University (4.06/4.33 CGPA), graduating December 2026.
            <br />
            I currently work as a Software Engineer at Reviewer.ly, after
            completing Application / Software Developer and Technical Systems
            Analyst co-op roles at CIBC.
            <br />
            <br />
            Apart from coding, some other activities that I love to do:
          </p>
          <ul>
            <li className="about-activity">
              <ImPointRight /> Playing piano
            </li>
            <li className="about-activity">
              <ImPointRight /> Staying active through sports and fitness
            </li>
            <li className="about-activity">
              <ImPointRight /> Exploring research, product ideas, and new tech
            </li>
          </ul>

          <p style={{ color: "rgb(155 126 172)" }}>
            "All our dreams can come true, if we have the courage to pursue
            them!"{" "}
          </p>
          <footer className="blockquote-footer">Walt Disney</footer>
        </blockquote>
      </Card.Body>
    </Card>
  );
}

export default AboutCard;
