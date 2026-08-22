import React from "react";
import Typewriter from "typewriter-effect";

function Type() {
  return (
    <Typewriter
      options={{
        strings: [
          "Software Engineer at Reviewer.ly",
          "Prev. Application / Software Developer Co-op @ CIBC",
          "Fourth-Year Computer Science Co-op Student at TMU",
          "Pianist",
        ],
        autoStart: true,
        loop: true,
        deleteSpeed: 50,
      }}
    />
  );
}

export default Type;
