package TwitterGatherDataFollowers.userRyersonU;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class DatasetImportAndBalanceSelfTest {
	private DatasetImportAndBalanceSelfTest() {
	}

	public static void main(String[] args) throws Exception {
		validDatasetLoadsFolloweeClasses();
		malformedLinesAreSkipped();
		originalAndBalancedRunsAreIndependent();
		repeatedBalancingIsStable();
		System.out.println("DatasetImportAndBalanceSelfTest passed");
	}

	private static void validDatasetLoadsFolloweeClasses() throws Exception {
		File dataset = new File("TestedDataset/Dataset-Journals-Authors-Titles-1k.txt");
		require(dataset.isFile(), "expected test dataset is missing: " + dataset.getAbsolutePath());
		ParsedDataset parsed = parseDataset(dataset);
		require(parsed.userFollowee.size() > 1, "valid dataset should load more than one user");
		require(classCount(parsed.userFollowee) > 1, "valid dataset should have more than one followee/class");
		require(parsed.skippedMalformed == 0, "valid dataset should not skip well-formed rows");
	}

	private static void malformedLinesAreSkipped() throws Exception {
		File temp = File.createTempFile("malformed-dsmp", ".txt");
		java.io.FileWriter writer = new java.io.FileWriter(temp);
		writer.write("GoodClass\t1\t2022-01-01\t10\tuserA\ttext one\r\n");
		writer.write("not-enough-columns\r\n");
		writer.write("BadClass\tnotANumber\t2022-01-01\t10\tuserB\ttext two\r\n");
		writer.write("GoodClass\t2\t2022-01-01\t10\tuserC\ttext three\r\n");
		writer.close();
		ParsedDataset parsed = parseDataset(temp);
		temp.delete();
		require(parsed.userFollowee.size() == 2, "only well-formed rows should create users");
		require(parsed.skippedMalformed >= 1, "malformed rows should be counted");
		require("GoodClass".equals(parsed.userFollowee.get("userA")), "userA class was lost");
	}

	private static void originalAndBalancedRunsAreIndependent() throws Exception {
		File dataset = new File("TestedDataset/Dataset-Journals-Authors-Titles-1k.txt");
		ParsedDataset parsed = parseDataset(dataset);
		SvmReproducibility.Split split = SvmReproducibility.stratifiedSplit(
				usersByClass(parsed.userFollowee), 0.30);
		DataBalancer.Result original = DataBalancer.apply(split.getTrainUsers(), parsed.userFollowee, false);
		DataBalancer.Result balanced = DataBalancer.apply(split.getTrainUsers(), parsed.userFollowee, true);
		require(original.getOutputTrainUsers().equals(split.getTrainUsers()),
				"original mode must keep the split training users");
		require(balanced.getOutputTrainUsers().size() >= original.getOutputTrainUsers().size(),
				"balanced training set should not shrink");
		require(split.getTestUsers().equals(SvmReproducibility.stratifiedSplit(
				usersByClass(parsed.userFollowee), 0.30).getTestUsers()),
				"test split should stay independent of balancing");
	}

	private static void repeatedBalancingIsStable() throws Exception {
		File dataset = new File("TestedDataset/Dataset-Journals-Authors-Titles-1k.txt");
		ParsedDataset parsed = parseDataset(dataset);
		SvmReproducibility.Split split = SvmReproducibility.stratifiedSplit(
				usersByClass(parsed.userFollowee), 0.30);
		DataBalancer.Result first = DataBalancer.apply(split.getTrainUsers(), parsed.userFollowee, true);
		DataBalancer.Result second = DataBalancer.apply(split.getTrainUsers(), parsed.userFollowee, true);
		require(first.getOutputTrainUsers().equals(second.getOutputTrainUsers()),
				"repeated balanced runs should be deterministic");
		DataBalancer.Result originalAgain = DataBalancer.apply(split.getTrainUsers(), parsed.userFollowee, false);
		require(originalAgain.getOutputTrainUsers().equals(split.getTrainUsers()),
				"switching back to original should restore the unbalanced training list");
	}

	private static ParsedDataset parseDataset(File file) throws Exception {
		ParsedDataset parsed = new ParsedDataset();
		final char END_OF_TWEET = '\r';
		int character;
		StringBuffer lineBuffer = new StringBuffer(1024);
		FileInputStream fileInput = new FileInputStream(file);
		BufferedInputStream bufferedInput = new BufferedInputStream(fileInput);
		while ((character = bufferedInput.read()) != -1) {
			if (character == END_OF_TWEET) {
				character = bufferedInput.read();
				if (character != -1 && character != '\n') {
					lineBuffer.append((char) character);
				}
				else if (character != -1 && character == '\n') {
					String[] info = lineBuffer.toString().split("\t", 6);
					lineBuffer.setLength(0);
					if (info.length < 6) {
						parsed.skippedMalformed++;
						continue;
					}
					try {
						Long.valueOf(info[1]);
					}
					catch (NumberFormatException ex) {
						parsed.skippedMalformed++;
						continue;
					}
					String followeeName = info[0];
					String currentUserName = info[4];
					if (!parsed.userFollowee.containsKey(currentUserName)) {
						parsed.userFollowee.put(currentUserName, followeeName);
					}
				}
			}
			else {
				lineBuffer.append((char) character);
			}
		}
		bufferedInput.close();
		fileInput.close();
		return parsed;
	}

	private static Map<String,List<String>> usersByClass(Map<String,String> userFollowee) {
		Map<String,List<String>> usersByClass = new LinkedHashMap<String,List<String>>();
		for (Map.Entry<String,String> entry : userFollowee.entrySet()) {
			List<String> users = usersByClass.get(entry.getValue());
			if (users == null) {
				users = new ArrayList<String>();
				usersByClass.put(entry.getValue(), users);
			}
			users.add(entry.getKey());
		}
		return usersByClass;
	}

	private static int classCount(Map<String,String> userFollowee) {
		return usersByClass(userFollowee).size();
	}

	private static void require(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}

	private static final class ParsedDataset {
		private final LinkedHashMap<String,String> userFollowee = new LinkedHashMap<String,String>();
		private int skippedMalformed;
	}
}
