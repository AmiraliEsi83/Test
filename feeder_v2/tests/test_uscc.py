from feeder_v2.uscc import is_valid_hk_brn, is_valid_uscc, uscc_check_digit


def test_known_uscc_checksums():
    assert is_valid_uscc("9132058172520705XD")
    assert is_valid_uscc("911000001000013428")  # Bank of China
    assert is_valid_uscc("91130706MAEQDDYM9P")
    assert is_valid_uscc("91310230MAK1C01T3N")


def test_uscc_rejects_bad_values():
    assert not is_valid_uscc(None)
    assert not is_valid_uscc("123")
    assert not is_valid_uscc("9132058172520705XX")
    assert uscc_check_digit("9132058172520705X") == "D"


def test_hk_brn():
    assert is_valid_hk_brn("77541433")
    assert not is_valid_hk_brn("7754143")
    assert not is_valid_hk_brn("BR77541433")
