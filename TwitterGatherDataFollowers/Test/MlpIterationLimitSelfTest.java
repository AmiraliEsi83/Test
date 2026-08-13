package TwitterGatherDataFollowers.userRyersonU;

import org.neuroph.core.data.DataSet;
import org.neuroph.core.data.DataSetRow;
import org.neuroph.nnet.MultiLayerPerceptron;
import org.neuroph.nnet.learning.BackPropagation;
import org.neuroph.util.TransferFunctionType;

public final class MlpIterationLimitSelfTest {
	private MlpIterationLimitSelfTest() {
	}

	public static void main(String[] args) {
		defaultsIncludeASafeIterationCap();
		customIterationLimitIsValidated();
		neurophHonorsConfiguredMaxIterations();
		System.out.println("MlpIterationLimitSelfTest passed");
	}

	private static void defaultsIncludeASafeIterationCap() {
		AlgorithmParameterSettings defaults = AlgorithmParameterSettings.defaults();
		require(defaults.getMlpMaxIterations() == 100, "default MLP max iterations should be 100");
		AlgorithmParameterSettings effective = AlgorithmParameterSettings.effective(null);
		require(effective.getMlpMaxIterations() == 100, "effective defaults should still cap iterations");
	}

	private static void customIterationLimitIsValidated() {
		AlgorithmParameterSettings settings = AlgorithmParameterSettings.defaults();
		settings.setCustomMlpEnabled(true);
		settings.setMlpMaxIterations(250);
		settings.validateForMlp();
		require(settings.getMlpMaxIterations() == 250, "custom max iterations were not kept");

		try {
			settings.setMlpMaxIterations(0);
			settings.validateForMlp();
			throw new AssertionError("max iterations of 0 should be rejected");
		}
		catch (IllegalArgumentException expected) {
			require(expected.getMessage().toLowerCase().contains("iteration"),
					"validation error should mention iterations");
		}
	}

	private static void neurophHonorsConfiguredMaxIterations() {
		DataSet data = new DataSet(2, 2);
		data.addRow(new DataSetRow(new double[] {0.0, 0.0}, new double[] {1.0, 0.0}));
		data.addRow(new DataSetRow(new double[] {1.0, 1.0}, new double[] {0.0, 1.0}));
		data.addRow(new DataSetRow(new double[] {0.0, 1.0}, new double[] {1.0, 0.0}));
		data.addRow(new DataSetRow(new double[] {1.0, 0.0}, new double[] {0.0, 1.0}));

		MultiLayerPerceptron mlp = new MultiLayerPerceptron(TransferFunctionType.TANH, 2, 4, 2);
		BackPropagation learning = (BackPropagation) mlp.getLearningRule();
		learning.setLearningRate(0.1);
		learning.setMaxError(0.0000001);
		learning.setMaxIterations(8);
		long started = System.currentTimeMillis();
		mlp.learn(data);
		long elapsed = System.currentTimeMillis() - started;
		require(learning.getCurrentIteration() <= 8, "Neuroph exceeded the configured max iterations");
		require(elapsed < 15000L, "tiny MLP with 8 iterations took too long: " + elapsed + " ms");
	}

	private static void require(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}
}
