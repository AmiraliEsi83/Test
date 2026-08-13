# DSMP Simulator Version 3.2

The DSMP Social Network Simulator can be used by researchers and students who want to benefit from the simple UI provided in this simulation tool to examine and compare different ML-based applications in a simulated social network environment.

**Student user guide:** see [USER_GUIDE.md](USER_GUIDE.md) for dataset import, Data Balancing (Section 7.2), MLP settings, Performance Measurement, and troubleshooting.

v3.2 adds a visible **Data Balancing** control and bounded **MLP** training (default max 100 iterations) so long runs stay predictable and the GUI can report progress. 

## Prerequisites

Before you begin, ensure you have the following software installed and configured on your system:

1.  **Git:** For cloning the repository. ([Download Git](https://git-scm.com/downloads))
2.  **Python (3.9 or 3.10):** The application requires **specifically Python 3.9 or 3.10**. Make sure the correct version is installed and accessible from your command line/terminal. ([Download Python](https://www.python.org/downloads/) [Download 3.9 Release](https://www.python.org/downloads/release/python-3913/))
    * *Tip:* Verify your installation by running `python --version` or `python3 --version`. On Windows, you might use `py --list` to see installed versions and `py -3.9` or `py -3.10` to invoke a specific one.
3.  **Java Development Kit (JDK 8 or higher):** Required for compiling and running the Java code. JDK 8 is preferred, but 9+ should work with the script's compatibility flags. Ensure `java` and `javac` are in your system's PATH. ([Download OpenJDK - Adoptium recommended](https://adoptium.net/))
    * *Tip:* Verify by running `java -version` and `javac -version`.
4.  **Apache Maven:** Used by the build script to download Java dependencies. Ensure `mvn` is in your system's PATH. ([Download Maven](https://maven.apache.org/download.cgi) | [Installation Guide](https://maven.apache.org/install.html))
    * *Tip:* Verify by running `mvn -version`.

**Important:** Ensure that the executable commands (`git`, `python`/`python3` or `py`, `java`, `javac`, `mvn`) for the prerequisites are available in your system's PATH environment variable. The build script relies on being able to call these tools directly.
## Installation 

1.  **Git Clone or Download the Repository**

2.  **Navigate to the Project Directory:**
    ```bash
    cd SocialNetworkSimulatorV3
    ```

3.  **Run the Setup Command:**
    This is the recommended first step. It will:
    * Create a Python virtual environment (`.venv`) using your Python 3.9/3.10.
    * Install required Python packages (from `requirements.txt`) into the virtual environment.
    * Download necessary NLTK data (`punkt`, `wordnet`).
    * Download Java dependencies (using Maven) into the `lib` directory.
    * Compile the Java source code into the `classes` directory.

    Execute the command using your **Python 3.9 or 3.10** executable:

    * **Windows (using the `py` launcher):**
        ```bash
        py -3.9 build.py setup
        # OR
        py -3.10 build.py setup
        ```
    * **Linux/macOS (assuming `python3.9` or `python3.10` is in PATH):**
        ```bash
        python3.9 build.py setup
        # OR
        python3.10 build.py setup
        ```
    * *(If `python` or `python3` directly maps to 3.9/3.10):*
        ```bash
        python build.py setup
        ```

## Running the Simulator

Once the setup is complete, you can run the simulator using the `run` command with the build script. This will execute the compiled Java code using the correct classpath and necessary Java/JADE arguments, leveraging the Python virtual environment for any potential Python interactions needed by the Java code.

Use the **same Python 3.9/3.10 executable** you used for setup:

* **Linux/macOS:**
    ```bash
    python3.9 build.py run
    # OR
    python3.10 build.py run
    ```
* **Windows:**
    ```bash
    py -3.9 build.py run
    # OR
    py -3.10 build.py run
    ```
* *(If `python` or `python3` directly maps to 3.9/3.10):*
    ```bash
    python build.py run
    ```
## Build tool help

If you are developing on the DSMP platform, some of the build tool commands may be confusing. Here is the "man page" for the command:

```bash
--- SocialNetworkSimulatorV3 Build/Run Script (Requires Python 3.9 or 3.10) ---
usage: build.py [-h] [-v]
                [{install,compile,run,rebuild,setup,clean,clean-java,clean-python,info,help}]

Startup and Build Script for SocialNetworkSimulatorV3

Automates setup, compilation, and running of the Java application.
Handles Python venv, pip packages, Maven dependencies, and Java compilation.

Usage:
  python build.py <command> [-v | --help]

Commands:
  install       Set up Python venv, install Python/Java dependencies.
  compile       Compile Java source code. Checks for JDK.
  run           Run the Java application. Checks prerequisites.
  rebuild       Clean Java classes, then compile.
  setup         Run 'install' then 'compile'. Full first-time setup.
  clean         Remove Java classes and Python venv.
  clean-java    Remove compiled Java classes directory only.
  clean-python  Remove Python virtual environment directory only.
  info          Display detected versions (Java, Maven, Python) and paths.
  help          Display this help message.

Options:
  -v, --verbose   Show detailed command execution output.
  -h, --help      Show this help message and exit.

Requires:
  - Python 3.9 or 3.10 to run this script.
  - Java Development Kit (JDK) 8 or higher (for 'compile', 'run').
  - Apache Maven (for 'install').

positional arguments:
  {install,compile,run,rebuild,setup,clean,clean-java,clean-python,info,help}
                        
                        Action to perform (default: shows help):
                          install       - Create/update Python venv (3.9 or 3.10), install pip/Maven deps.
                          compile       - Compile Java code ('userRyersonU' -> 'classes'). Needs JDK 8+.
                          run           - Execute Java app. Needs JDK 8+, classes, venv.
                          rebuild       - Clean Java classes, then compile.
                          setup         - Run 'install', then 'compile'. For initial setup.
                          clean         - Remove Java classes and Python venv.
                          clean-java    - Remove only compiled Java classes ('classes').
                          clean-python  - Remove only Python venv ('.venv').
                          info          - Show detected versions and project paths.
                          help          - Display this help message.

optional arguments:
  -h, --help            show this help message and exit
  -v, --verbose         Enable detailed output.

Example: python build.py setup -v
```

## Troubleshooting

* **Command Not Found Errors:** Ensure Git, Python 3.9/3.10, JDK (java/javac), and Maven (mvn) are correctly installed and their directories are added to your system's PATH environment variable.
* **Incorrect Python Version Error:** Double-check that you are running the `build.py` script using a Python 3.9 or 3.10 interpreter. Use `python --version` or `py --list` to verify.
* **Build/Run Failures:**
    * Run `python build.py info` to check if the script detects your tools correctly.
    * Run the command with the `-v` (verbose) flag (e.g., `python build.py setup -v`) to see detailed output which might indicate the source of the problem.
    * Try cleaning and rebuilding: `python build.py clean` followed by `python build.py setup`.
    * Ensure you have a stable internet connection for downloading dependencies.
* **Cannot find Data Balancing:** Open **File -> Dataset From Text**. The import dialog has a **Data Balancing** panel. The same setting also appears on the Performance Measurement panel as **Data Balancing**. See USER_GUIDE.md Section 7.2.
* **MLP seems frozen or takes a long time:** Training runs in a background agent thread. Watch **Current Progress** and the results pane for iteration updates. Default Legacy Neuroph MLP stops after **100 iterations**. Increase or decrease this in **MLP Settings**. For a quicker check, use **SVM**.
* **Invalid dataset / model failed:** The GUI shows an error dialog. Technical details remain in the console. Re-load the file, press **Get Users**, then **Initialize** before running again.

