import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import myImg from "../../Assets/avatar.svg";
import Tilt from "react-parallax-tilt";
import {
  AiFillGithub,
  AiOutlineTwitter,
  AiFillInstagram,
} from "react-icons/ai";
import { FaLinkedinIn } from "react-icons/fa";

function Home2() {
  return (
    <Container fluid className="home-about-section" id="about">
      <Container>
        <Row>
          <Col md={8} className="home-about-description">
            <h1 style={{ fontSize: "2.6em" }}>
              LET ME <span className="purple"> INTRODUCE </span> MYSELF
            </h1>
            <p className="home-about-body">
              I am a fourth-year Computer Science Co-op student at
              <i>
                <b className="purple">
                  {" "}
                  Toronto Metropolitan University
                </b>
              </i>{" "}
              and a Software Engineer at
              <i>
                <b className="purple"> Reviewer.ly</b>
              </i>
              , building AI-powered software with a focus on practical,
              high-quality engineering.
              <br />
              <br />
              Previously, I spent more than a year at
              <i>
                <b className="purple"> CIBC</b>
              </i>{" "}
              as an Application / Software Developer Co-op in LiveLabs and as a
              Technical Systems Analyst, shipping production banking features,
              workflow automation, and Data &amp; AI work.
              <br />
              <br />I work across
              <i>
                <b className="purple">
                  {" "}
                  Swift, TypeScript, Python, Java, and SQL
                </b>
              </i>
              , and I enjoy building products with
              <b className="purple"> React</b>,
              <b className="purple"> Node.js</b>, and
              <i>
                <b className="purple"> SwiftUI</b>
              </i>
              .
              <br />
              <br />
              Outside of engineering, I am a professional pianist with a
              strong interest in fitness, leadership, and research. Recent
              recognitions include the
              <i>
                <b className="purple">
                  {" "}
                  Louise Penny Library Research Award
                </b>
              </i>
              , the
              <i>
                <b className="purple">
                  {" "}
                  Geoff Boyes International Student Leadership Award
                </b>
              </i>
              , and the
              <i>
                <b className="purple"> TMU Faculty of Science Dean&apos;s List</b>
              </i>
              .
            </p>
          </Col>
          <Col md={4} className="myAvtar">
            <Tilt>
              <img src={myImg} className="img-fluid" alt="avatar" />
            </Tilt>
          </Col>
        </Row>
        <Row>
          <Col md={12} className="home-about-social">
            <h1>FIND ME ON</h1>
            <p>
              Feel free to <span className="purple">connect </span>with me
            </p>
            <ul className="home-about-social-links">
              <li className="social-icons">
                <a
                  href="https://github.com/AmiraliEsi83"
                  target="_blank"
                  rel="noreferrer"
                  className="icon-colour  home-social-icons"
                >
                  <AiFillGithub />
                </a>
              </li>
              <li className="social-icons">
                <a
                  href="https://twitter.com/AmirAli_Esi"
                  target="_blank"
                  rel="noreferrer"
                  className="icon-colour  home-social-icons"
                >
                  <AiOutlineTwitter />
                </a>
              </li>
              <li className="social-icons">
                <a
                  href="https://www.linkedin.com/in/amiralieslami/"
                  target="_blank"
                  rel="noreferrer"
                  className="icon-colour  home-social-icons"
                >
                  <FaLinkedinIn />
                </a>
              </li>
              <li className="social-icons">
                <a
                  href="https://www.instagram.com/amirali._.esi"
                  target="_blank"
                  rel="noreferrer"
                  className="icon-colour home-social-icons"
                >
                  <AiFillInstagram />
                </a>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}
export default Home2;
