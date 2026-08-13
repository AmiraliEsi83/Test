package TwitterGatherDataFollowers.userRyersonU;

import org.neuroph.core.data.DataSet;
import org.neuroph.core.data.DataSetRow;
import org.neuroph.nnet.MultiLayerPerceptron;
import org.neuroph.nnet.learning.BackPropagation;
import org.neuroph.util.TransferFunctionType;

/**
 * Reproduces the tester concern that uncapped MLP can run far too long,
 * and verifies the v3.2 default cap completes in a bounded time.
 */
public final class MlpBoundedRuntimeSelfTest {
	private MlpBoundedRuntimeSelfTest() {
	}

	public static void main(String[] args) {
		cappedTrainingCompletesOnMediumSparseLikeData();
		higherCapTakesAtLeastAsManyIterations();
		System.out.println("MlpBoundedRuntimeSelfTest passed");
	}

	private static void cappedTrainingCompletesOnMediumSparseLikeData() {
		DataSet data = mediumDataset();
		MultiLayerPerceptron mlp = new MultiLayerPerceptron(TransferFunctionType.TANH, 80, 10, 4);
		BackPropagation learning = (BackPropagation) mlp.getLearningRule();
		learning.setLearningRate(0.1);
		learning.setMaxError(0.0000001);
		int maxIterations = AlgorithmParameterSettings.defaults().getMlpMaxIterations();
		learning.setMaxIterations(maxIterations);
		long started = System.currentTimeMillis();
		mlp.learn(data);
		long elapsed = System.currentTimeMillis() - started;
		System.out.println("Capped MLP finished in " + elapsed + " ms after "
				+ learning.getCurrentIteration() + " iteration(s) (cap=" + maxIterations + ")");
		require(learning.getCurrentIteration() <= maxIterations, "default cap was not respected");
		require(elapsed < 120000L, "capped medium MLP took too long: " + elapsed + " ms");
	}

	private static void higherCapTakesAtLeastAsManyIterations() {
		DataSet data = mediumDataset();
		int firstIters = trainAndCount(data, 5);
		int secondIters = trainAndCount(data, 15);
		require(firstIters <= 5, "5-iteration cap was exceeded");
		require(secondIters <= 15, "15-iteration cap was exceeded");
		require(secondIters >= firstIters, "raising the cap should not reduce completed iterations");
	}

	private static int trainAndCount(DataSet data, int maxIterations) {
		MultiLayerPerceptron mlp = new MultiLayerPerceptron(TransferFunctionType.TANH, 80, 10, 4);
		BackPropagation learning = (BackPropagation) mlp.getLearningRule();
		learning.setLearningRate(0.1);
		learning.setMaxError(0.0000001);
		learning.setMaxIterations(maxIterations);
		mlp.learn(data);
		return learning.getCurrentIteration();
	}

	private static DataSet mediumDataset() {
		DataSet data = new DataSet(80, 4);
		for (int i = 0; i < 48; i++) {
			double[] input = new double[80];
			double[] output = new double[4];
			int classIndex = i < 24 ? 0 : (i < 36 ? 1 : (i < 42 ? 2 : 3));
			output[classIndex] = 1.0;
			for (int f = 0; f < 80; f++) {
				input[f] = ((i * 17 + f * 13) % 100) / 100.0;
			}
			data.addRow(new DataSetRow(input, output));
		}
		return data;
	}

	private static void require(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}
}
