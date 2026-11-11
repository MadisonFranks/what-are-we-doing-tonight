
#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int matchingInterests = 3;
    int totalInterests = 5;

    int score = (matchingInterests * 100) / totalInterests;

    score = clamp(score, 0, 100);

    cout << score << endl;

    return 0;
}
