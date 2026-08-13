package TwitterGatherDataFollowers.userRyersonU;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class DataBalancerSelfTest {
	private DataBalancerSelfTest() {
	}

	public static void main(String[] args) {
		disabledKeepsOriginalOrderAndCounts();
		doesNotMutateCallerList();
		oversamplesMinorityToMajorityCount();
		handlesAlreadyBalancedDataset();
		handlesMulticlassImbalance();
		duplicatesTinyMinorityClass();
		skipsUsersWithMissingClassLabels();
		handlesEmptyTrainingSet();
		isDeterministic();
		preservesFeatureLabelAlignment();
		System.out.println("DataBalancerSelfTest passed");
	}

	private static void disabledKeepsOriginalOrderAndCounts() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "b1");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, standardLabels(), false);
		require(!result.isEnabled(), "disabled balancing should not be marked enabled");
		require(result.getOutputTrainUsers().equals(trainUsers), "disabled balancing changed the training users");
		require(result.getOriginalCounts().get("A").intValue() == 3, "original A count was wrong");
		require(result.getOriginalCounts().get("B").intValue() == 1, "original B count was wrong");
		require(result.summaryText().contains("Use Original Dataset"), "disabled summary was missing");
	}

	private static void doesNotMutateCallerList() {
		ArrayList<String> trainUsers = new ArrayList<String>(Arrays.asList("a1", "a2", "a3", "b1"));
		DataBalancer.apply(trainUsers, standardLabels(), true);
		require(trainUsers.equals(Arrays.asList("a1", "a2", "a3", "b1")),
				"balancing mutated the caller training list");
	}

	private static void oversamplesMinorityToMajorityCount() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "b1");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, standardLabels(), true);
		require(result.isEnabled(), "enabled balancing was not marked enabled");
		require(!result.isUnchanged(), "imbalanced data was reported as unchanged");
		require(result.getOutputTrainUsers().size() == 6, "balanced training size should be 3+3");
		require(result.getBalancedCounts().get("A").intValue() == 3, "majority class A should stay at 3");
		require(result.getBalancedCounts().get("B").intValue() == 3, "minority class B should be oversampled to 3");
		require(result.getOutputTrainUsers().subList(0, 4).equals(trainUsers),
				"original training users should remain at the front");
		require(result.summaryText().contains("Original class distribution:"), "original distribution missing");
		require(result.summaryText().contains("Class A: 3"), "formatted A count missing");
		require(result.summaryText().contains("Class B: 1"), "formatted original B count missing");
		require(result.summaryText().contains("Balanced class distribution:"), "balanced distribution missing");
	}

	private static void handlesAlreadyBalancedDataset() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "b1", "b2");
		Map<String,String> labels = new LinkedHashMap<String,String>();
		labels.put("a1", "A");
		labels.put("a2", "A");
		labels.put("b1", "B");
		labels.put("b2", "B");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, labels, true);
		require(result.isUnchanged(), "already-balanced data should stay unchanged");
		require(result.getOutputTrainUsers().equals(trainUsers), "already-balanced users were rewritten");
		require(result.summaryText().contains("already balanced"), "already-balanced message missing");
	}

	private static void handlesMulticlassImbalance() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "a4", "b1", "c1", "c2");
		Map<String,String> labels = new LinkedHashMap<String,String>();
		labels.put("a1", "A");
		labels.put("a2", "A");
		labels.put("a3", "A");
		labels.put("a4", "A");
		labels.put("b1", "B");
		labels.put("c1", "C");
		labels.put("c2", "C");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, labels, true);
		require(result.getBalancedCounts().get("A").intValue() == 4, "class A should remain 4");
		require(result.getBalancedCounts().get("B").intValue() == 4, "class B should be oversampled to 4");
		require(result.getBalancedCounts().get("C").intValue() == 4, "class C should be oversampled to 4");
		require(result.getOutputTrainUsers().size() == 12, "multiclass balanced size should be 4+4+4");
	}

	private static void duplicatesTinyMinorityClass() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "rare");
		Map<String,String> labels = new LinkedHashMap<String,String>();
		labels.put("a1", "A");
		labels.put("a2", "A");
		labels.put("a3", "A");
		labels.put("rare", "Rare");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, labels, true);
		require(result.getBalancedCounts().get("Rare").intValue() == 3, "tiny minority was not oversampled");
		int rareCopies = 0;
		for (String user : result.getOutputTrainUsers()) {
			if ("rare".equals(user)) {
				rareCopies++;
			}
		}
		require(rareCopies == 3, "tiny minority should be duplicated from its only example");
	}

	private static void skipsUsersWithMissingClassLabels() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "mystery", "b1");
		DataBalancer.Result result = DataBalancer.apply(trainUsers, standardLabels(), true);
		require(result.getMissingClassCount() == 1, "missing class count should be 1");
		require(result.getOutputTrainUsers().contains("mystery"), "unlabeled user was dropped");
		require(result.summaryText().contains("missing"), "missing-label warning was omitted");
	}

	private static void handlesEmptyTrainingSet() {
		DataBalancer.Result result = DataBalancer.apply(new ArrayList<String>(), standardLabels(), true);
		require(result.getOutputTrainUsers().isEmpty(), "empty training set should stay empty");
		require(result.isUnchanged(), "empty training set should be reported as unchanged");
	}

	private static void isDeterministic() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "b1");
		DataBalancer.Result first = DataBalancer.apply(trainUsers, standardLabels(), true);
		DataBalancer.Result second = DataBalancer.apply(trainUsers, standardLabels(), true);
		require(first.getOutputTrainUsers().equals(second.getOutputTrainUsers()),
				"oversampling was not deterministic");
	}

	private static void preservesFeatureLabelAlignment() {
		List<String> trainUsers = Arrays.asList("a1", "a2", "a3", "b1");
		Map<String,String> labels = standardLabels();
		DataBalancer.Result result = DataBalancer.apply(trainUsers, labels, true);
		for (String user : result.getOutputTrainUsers()) {
			require(labels.containsKey(user), "balanced user lost its class label: " + user);
		}
	}

	private static Map<String,String> standardLabels() {
		Map<String,String> labels = new LinkedHashMap<String,String>();
		labels.put("a1", "A");
		labels.put("a2", "A");
		labels.put("a3", "A");
		labels.put("b1", "B");
		return labels;
	}

	private static void require(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}
}
